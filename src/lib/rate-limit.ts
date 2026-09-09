import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "./logger";

// If Upstash creds are present we use distributed Redis-backed limiting
// (safe across serverless/multi-pod). Otherwise we fall back to an
// in-process map — fine for `npm run dev` and single-instance prod, but
// each pod gets its own counter on horizontal deploys.
const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

interface Limiter {
  limit: (
    key: string,
  ) => Promise<{
    success: boolean;
    remaining: number;
    reset: number;
  }>;
}

/**
 * Evict expired buckets once the map grows past this. Without it the map
 * only ever overwrote entries whose key came back after expiry — keys
 * that never returned (the common case for IP-keyed limits under scan
 * traffic) accumulated for the lifetime of the process.
 */
const IN_MEMORY_SWEEP_THRESHOLD = 5_000;

function inMemoryLimiter(maxRequests: number, windowMs: number): Limiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  const sweep = (now: number) => {
    for (const [k, v] of buckets) {
      if (v.resetAt < now) buckets.delete(k);
    }
  };

  return {
    async limit(key: string) {
      const now = Date.now();
      if (buckets.size > IN_MEMORY_SWEEP_THRESHOLD) sweep(now);
      const b = buckets.get(key);
      if (!b || b.resetAt < now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return {
          success: true,
          remaining: maxRequests - 1,
          reset: now + windowMs,
        };
      }
      if (b.count >= maxRequests) {
        return { success: false, remaining: 0, reset: b.resetAt };
      }
      b.count += 1;
      return {
        success: true,
        remaining: maxRequests - b.count,
        reset: b.resetAt,
      };
    },
  };
}

// One client shared by every limiter. `Redis.fromEnv()` was previously
// called once per limiter, creating eight clients for the same endpoint.
let sharedRedis: Redis | null = null;
function getRedis(): Redis {
  sharedRedis ??= Redis.fromEnv();
  return sharedRedis;
}

function build(maxRequests: number, windowSeconds: number, prefix: string): Limiter {
  if (hasUpstash) {
    const redis = getRedis();
    const rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
      prefix,
      analytics: true,
    });
    return {
      async limit(key) {
        const r = await rl.limit(key);
        return { success: r.success, remaining: r.remaining, reset: r.reset };
      },
    };
  }
  return inMemoryLimiter(maxRequests, windowSeconds * 1000);
}

// Tight: registration is a write that creates rows in the DB.
export const registerLimiter = build(5, 60 * 60, "rl:register"); // 5 / hr / IP

// Looser: search is a read that proxies TMDB; protect TMDB quota.
export const searchLimiter = build(60, 60, "rl:search"); // 60 / min / IP

// Auth attempts (credentials login) — slow brute-force.
export const loginLimiter = build(10, 5 * 60, "rl:login"); // 10 / 5min / IP

// Authenticated writes — per user (safe across IP / NAT).
export const commentsPostLimiter = build(25, 60 * 60, "rl:comments:post");
export const commentsDeleteLimiter = build(40, 60 * 60, "rl:comments:del");
export const favoritesWriteLimiter = build(80, 60 * 60, "rl:fav:write");
export const historyWriteLimiter = build(200, 60 * 60, "rl:hist:write");

// Admin mutations. Per-admin (cap blast radius if a token is stolen).
export const adminWriteLimiter = build(120, 60, "rl:admin:write");

/**
 * Resolve the client IP from request headers, honoring only the headers
 * our trusted edge sets. `x-forwarded-for` is the well-known footgun
 * because clients can spoof it; we prefer platform-specific headers
 * (Cloudflare, Vercel) and, only when they're absent, take the LAST
 * entry of XFF (the closest hop to us — typically the trusted proxy).
 *
 * On bare-metal behind a custom proxy, configure the proxy to overwrite
 * `x-forwarded-for` and not append (or set a trusted header instead).
 */
export function getClientIp(req: Request): string {
  // Cloudflare
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  // Vercel
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  // Generic X-Forwarded-For — take RIGHTMOST entry (closest trusted hop),
  // not leftmost (client-controlled).
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/**
 * Surface the degraded configuration at boot rather than letting a
 * deploy that forgot the Upstash credentials look healthy while silently
 * running per-pod limits.
 */
export function warnIfRateLimitsAreLocal(): void {
  if (!hasUpstash && process.env.NODE_ENV === "production") {
    logger("rate-limit").warn(
      "UPSTASH_REDIS_REST_URL/TOKEN are unset — falling back to in-process " +
        "limits. On a multi-instance deploy each instance keeps its own " +
        "counters, so effective limits are N x configured.",
    );
  }
}

export function rateLimitResponse(reset: number) {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return new Response(
    JSON.stringify({ error: "Too many requests", retryAfter }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "Cache-Control": "no-store",
      },
    },
  );
}

/**
 * Standard headers for JSON responses on routes that read or mutate
 * user-scoped data. Prevents shared proxies / browser BFCache from
 * serving stale data and prevents accidental caching of authenticated
 * responses.
 */
export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;
