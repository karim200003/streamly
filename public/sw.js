// Streamly service worker — minimal, no third-party deps.
// Strategy:
//   - HTML pages: network-first with cache fallback for offline.
//   - TMDB images & static assets: stale-while-revalidate.
//   - Everything else: network only (don't cache POSTs, /api/auth, etc).

const VERSION = "v1";
const STATIC_CACHE = `streamly-static-${VERSION}`;
const PAGE_CACHE = `streamly-pages-${VERSION}`;
const IMG_CACHE = `streamly-img-${VERSION}`;

const CORE = ["/", "/offline"];

// Routes whose HTML is user-scoped and must never enter any cache.
const PRIVATE_PREFIXES = ["/admin", "/favorites", "/history", "/sign-in"];

// Cap the image cache so a long browsing session can't grow it without
// bound — every poster ever viewed would otherwise persist forever.
const IMG_CACHE_MAX_ENTRIES = 300;

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  // Cache Storage preserves insertion order, so the oldest entries sort
  // first — evict from the front until we're back under the cap.
  for (const key of keys.slice(0, Math.max(0, keys.length - maxEntries))) {
    await cache.delete(key);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(CORE)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, PAGE_CACHE, IMG_CACHE].includes(k))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

function isImageRequest(url) {
  return (
    url.hostname === "image.tmdb.org" ||
    /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(url.pathname)
  );
}

function isPageRequest(req) {
  return (
    req.method === "GET" &&
    req.headers.get("accept")?.includes("text/html")
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Skip API surface and auth — never cache personal data.
  //
  // PRIVATE_PREFIXES covers every route that renders user-scoped data.
  // These pages are `force-dynamic` server components containing one
  // account's favorites / history, so caching their HTML would let the
  // next person on a shared device read the previous user's list from
  // the offline fallback. Keep in sync with the pages that call
  // `auth()` / export `dynamic = "force-dynamic"`.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/") ||
    PRIVATE_PREFIXES.some(
      (p) => url.pathname === p || url.pathname.startsWith(`${p}/`),
    )
  ) {
    return;
  }

  // Skip cross-origin embed providers — never useful to cache.
  if (
    url.hostname !== self.location.hostname &&
    !isImageRequest(url) &&
    url.hostname !== "fonts.googleapis.com" &&
    url.hostname !== "fonts.gstatic.com"
  ) {
    return;
  }

  if (isImageRequest(url)) {
    event.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res.ok) {
              cache
                .put(req, res.clone())
                .then(() => trimCache(IMG_CACHE, IMG_CACHE_MAX_ENTRIES))
                .catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached ?? fetchPromise;
      }),
    );
    return;
  }

  if (isPageRequest(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGE_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          return caches.match("/offline");
        }),
    );
    return;
  }

  // Static assets (Next chunks, /_next/static): cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
  }
});
