"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Server, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StreamServer } from "@/lib/vidsrc";
import type { MediaType } from "@/lib/tmdb-shared";

export interface PlayerMedia {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  season?: number;
  episode?: number;
}

/** Don't persist more than one progress write per this many ms. */
const PROGRESS_THROTTLE_MS = 15_000;
/** Ignore reports below this — an accidental click shouldn't be "resume". */
const MIN_REPORTABLE_SECONDS = 5;

/**
 * Normalise a progress event from a third-party embed.
 *
 * Each provider ships its own payload shape and none of them are
 * versioned, so we read defensively: accept a JSON string or an object,
 * and look for the handful of key names they are known to use. Anything
 * we can't confidently read is ignored rather than guessed at.
 */
function readProgressEvent(
  raw: unknown,
): { progress: number; duration: number } | null {
  let data: unknown = raw;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;
  // Providers nest the payload under `data` or `progress` about as often
  // as they put it at the top level.
  const nested =
    (obj.data as Record<string, unknown> | undefined) ??
    (obj.progress as Record<string, unknown> | undefined) ??
    obj;
  if (!nested || typeof nested !== "object") return null;

  const pick = (...keys: string[]): number | null => {
    for (const k of keys) {
      const v = (nested as Record<string, unknown>)[k];
      const n = typeof v === "string" ? Number(v) : v;
      if (typeof n === "number" && Number.isFinite(n) && n >= 0) return n;
    }
    return null;
  };

  const progress = pick("currentTime", "watched", "progress", "time", "seconds");
  const duration = pick("duration", "total", "length");
  if (progress === null || duration === null || duration <= 0) return null;
  if (progress > duration) return null;
  return { progress, duration };
}

export default function Player({
  servers,
  media,
}: {
  servers: StreamServer[];
  media?: PlayerMedia;
}) {
  const [active, setActive] = useState(0);
  const [theater, setTheater] = useState(false);
  // Bumping this re-mounts the iframe, forcing the embed to reload.
  const [reloadKey, setReloadKey] = useState(0);
  const current = servers[active];

  // Latest reported position, and the last one we actually persisted.
  const latest = useRef<{ progress: number; duration: number } | null>(null);
  const lastSent = useRef(0);

  const persist = useCallback(
    (keepalive: boolean) => {
      const point = latest.current;
      if (!media || !point) return;
      if (point.progress < MIN_REPORTABLE_SECONDS) return;
      lastSent.current = Date.now();
      // Deliberately the REST route rather than the recordWatch Server
      // Action: the pagehide flush needs `keepalive` so the browser
      // completes the request while the page is unloading, and Server
      // Actions don't expose that. Fire-and-forget either way — losing a
      // progress ping isn't worth surfacing to the viewer.
      void fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...media, ...point }),
        keepalive,
      }).catch(() => {});
    },
    [media],
  );

  // Listen for playback progress posted by the active embed.
  //
  // The iframe is third-party and unsandboxed, so `event.origin` is the
  // only thing separating a real player event from any other frame on
  // the page posting to us. We compare it against the origin of the URL
  // we actually loaded and drop everything else.
  const currentUrl = current?.url;
  useEffect(() => {
    if (!media || !currentUrl) return;

    let expectedOrigin: string;
    try {
      expectedOrigin = new URL(currentUrl).origin;
    } catch {
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== expectedOrigin) return;
      const point = readProgressEvent(event.data);
      if (!point) return;
      latest.current = point;
      if (Date.now() - lastSent.current >= PROGRESS_THROTTLE_MS) {
        persist(false);
      }
    };

    // Flush whatever we have when the tab goes away — `pagehide` fires in
    // cases `beforeunload` misses (bfcache, mobile app switch).
    const onPageHide = () => persist(true);

    window.addEventListener("message", onMessage);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("pagehide", onPageHide);
      persist(true);
    };
  }, [media, currentUrl, persist]);

  // ESC exits theater mode.
  useEffect(() => {
    if (!theater) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTheater(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [theater]);

  return (
    <div
      className={cn(
        "transition-all duration-300",
        theater
          ? "fixed inset-0 z-50 bg-black px-0 pb-0"
          : "px-4 sm:px-6 lg:px-10 pb-12",
      )}
    >
      <div
        className={cn(
          "mx-auto",
          theater ? "max-w-none h-full flex flex-col" : "max-w-screen-2xl",
        )}
      >
        <div
          className={cn(
            "relative w-full bg-black overflow-hidden",
            theater
              ? "flex-1 rounded-none border-0"
              : "aspect-video rounded-xl border border-white/10 shadow-2xl shadow-black/50",
          )}
        >
          {current && (
            <iframe
              key={`${current.url}::${reloadKey}`}
              src={current.url}
              title={`Video player — ${current.name}`}
              // NOTE: no sandbox attribute. The third-party embed
              // providers (videasy/vidking/vidfast/etc.) break under
              // sandbox — they verify event.origin on postMessage
              // and/or need top-window access for fullscreen handoff,
              // so a unique-origin sandboxed iframe stops playing.
              // referrerPolicy="no-referrer" keeps us from leaking our
              // origin to them, which is the best we can do without
              // owning the playback layer.
              allow="accelerometer; autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full"
            />
          )}

          {/* Floating theater toggle in the top-right of the player surface. */}
          <button
            onClick={() => setTheater((t) => !t)}
            aria-label={theater ? "Exit theater mode" : "Enter theater mode"}
            className="absolute top-3 right-3 z-10 size-9 grid place-items-center rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white/90 hover:bg-black/75 active:scale-95 transition opacity-0 hover:opacity-100 focus-visible:opacity-100 group-hover/wrapper:opacity-100"
          >
            {theater ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </button>
        </div>

        {/* Source picker row. Hidden in theater mode (toggle via icon overlay). */}
        {!theater && (
          <>
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[var(--color-muted)] font-semibold">
                <Server className="size-3.5" />
                Source
              </span>
              <div className="flex items-center gap-1.5 p-1 rounded-full glass">
                {servers.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setActive(i)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-sm font-medium transition relative",
                      i === active
                        ? "bg-white text-black shadow-sm"
                        : "text-white/70 hover:text-white hover:bg-white/5",
                    )}
                  >
                    {s.name}
                    {i === active && s.supportsProgress && (
                      <span
                        className="ml-1.5 inline-block size-1 rounded-full bg-emerald-400"
                        title="Resume support"
                      />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass hover:bg-white/10 text-sm transition"
                title="Reload current source"
              >
                <RefreshCw className="size-3.5" />
                <span className="hidden sm:inline">Reload</span>
              </button>
              <button
                onClick={() => setTheater(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass hover:bg-white/10 text-sm transition"
                title="Theater mode (Esc to exit)"
              >
                <Maximize2 className="size-3.5" />
                <span className="hidden sm:inline">Theater</span>
              </button>
            </div>
            <p className="mt-3 text-xs text-white/50 max-w-2xl">
              If a source is unavailable for a title, try another. Streams are
              provided by independent third-party embed services.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
