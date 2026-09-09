"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import { Play, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaSummary } from "@/features/catalog/domain";

interface MovieCardProps {
  media: MediaSummary;
  priority?: boolean;
}

// Shared across every card on the page so hovering the same title twice
// doesn't refetch. Bounded because it is module-scoped and would
// otherwise grow for the lifetime of the tab.
const TRAILER_CACHE_MAX = 200;
const trailerCache = new Map<string, string | null | Promise<string | null>>();

function rememberTrailer(
  key: string,
  value: string | null | Promise<string | null>,
) {
  // Map preserves insertion order, so the first key is the oldest.
  if (trailerCache.size >= TRAILER_CACHE_MAX && !trailerCache.has(key)) {
    const oldest = trailerCache.keys().next().value;
    if (oldest !== undefined) trailerCache.delete(oldest);
  }
  trailerCache.set(key, value);
}

async function getTrailerKey(
  type: "movie" | "tv",
  id: number,
): Promise<string | null> {
  const k = `${type}-${id}`;
  const hit = trailerCache.get(k);
  // Awaiting a settled value is a no-op, so both branches were identical
  // in the original ternary.
  if (hit !== undefined) return hit;
  const p = fetch(`/api/trailer?tmdbId=${id}&mediaType=${type}`)
    .then((r) => (r.ok ? r.json() : { key: null }))
    .then((d: { key: string | null }) => d.key)
    .catch(() => null);
  rememberTrailer(k, p);
  const result = await p;
  rememberTrailer(k, result);
  return result;
}

export default function MovieCard({ media, priority }: MovieCardProps) {
  // All derivation now happens once in the mapper — this component
  // reads resolved fields instead of re-deriving title/year/type from
  // TMDB's wire shape.
  const { title, year, mediaType: type, posterUrl: poster, rating } = media;
  const score = rating ?? 0;

  const [hoverArmed, setHoverArmed] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerVisible, setTrailerVisible] = useState(false);
  const armTimerRef = useRef<number | null>(null);
  const swapTimerRef = useRef<number | null>(null);
  // Generation counter — every onEnter bumps it so a late async fetch
  // from a previous hover can't mutate state for the current one.
  const genRef = useRef(0);

  // Evaluated lazily inside the handler rather than on every render.
  // Hover previews only make sense on a pointer device with room to show
  // them.
  const previewEnabled = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (min-width: 768px)").matches;

  const clearTimers = () => {
    if (armTimerRef.current) {
      window.clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
    if (swapTimerRef.current) {
      window.clearTimeout(swapTimerRef.current);
      swapTimerRef.current = null;
    }
  };

  const onEnter = () => {
    if (!previewEnabled()) return;
    const gen = ++genRef.current;
    armTimerRef.current = window.setTimeout(async () => {
      if (gen !== genRef.current) return; // stale hover
      setHoverArmed(true);
      const key = await getTrailerKey(type, media.id);
      if (gen !== genRef.current) return; // user already left
      if (key) {
        setTrailerKey(key);
        // Fallback timer — if the iframe never fires onLoad (slow
        // network, blocked, etc.) we still swap after a short delay
        // rather than leaving the trailer hidden forever. The
        // iframe's onLoad will take over earlier when it fires.
        swapTimerRef.current = window.setTimeout(() => {
          if (gen !== genRef.current) return;
          setTrailerVisible(true);
        }, 600);
      }
    }, 600);
  };

  const onLeave = () => {
    genRef.current++; // invalidate any in-flight callbacks
    clearTimers();
    setHoverArmed(false);
    setTrailerVisible(false);
  };

  // Triggered once the embedded YouTube document loads. Combined with
  // the fallback timer above, ensures the poster never vanishes
  // before there's something to replace it with.
  const onIframeLoad = () => {
    setTrailerVisible(true);
  };

  useEffect(() => {
    return clearTimers;
  }, []);

  // Image is ONLY hidden while we're actively hovering AND the
  // trailer is in the visible swap state. If any of those flips
  // off (mouseleave race, late timer firing, etc.) the poster
  // re-appears immediately.
  const hidePoster = hoverArmed && trailerVisible;

  return (
    <m.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="group relative"
    >
      <Link href={media.href} className="block">
        {/* Poster surface. The old treatment stacked a red glow, a white
            ring and a border on hover; a single soft ring plus lift reads
            calmer and lets the artwork carry the card. */}
        <div
          className={cn(
            "relative aspect-[2/3] overflow-hidden bg-[var(--color-bg-2)]",
            "rounded-[var(--radius-tile)] border border-white/[0.07]",
            "shadow-[0_10px_30px_-14px_rgba(0,0,0,0.9)]",
            "transition-[box-shadow,border-color] duration-300",
            "group-hover:border-white/20",
            "group-hover:shadow-[0_18px_44px_-16px_rgba(0,0,0,0.95)]",
          )}
        >
          {poster ? (
            <Image
              src={poster}
              alt={title}
              fill
              priority={priority}
              sizes="(max-width: 640px) 160px, (max-width: 1024px) 180px, 200px"
              className={cn(
                "object-cover transition-all duration-700 ease-out",
                "group-hover:scale-[1.06]",
                hidePoster && "opacity-0 scale-110",
              )}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-xs text-[var(--color-muted)] p-4 text-center">
              {title}
            </div>
          )}

          {/* Score chip — top-left, fades out as the hover state takes over. */}
          {score > 0 && (
            <span
              className={cn(
                "absolute top-2 left-2 chip text-white",
                "transition-all duration-300",
                "group-hover:opacity-0 group-hover:-translate-y-1",
              )}
            >
              <Star className="size-3 fill-current" />
              {score.toFixed(1)}
            </span>
          )}

          {/* Trailer preview iframe (lazy-loaded on hover). */}
          {hoverArmed && trailerKey && (
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-500 pointer-events-none",
                hidePoster ? "opacity-100" : "opacity-0",
              )}
              aria-hidden
            >
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&controls=0&modestbranding=1&rel=0&loop=1&mute=1&playsinline=1&playlist=${trailerKey}&iv_load_policy=3&disablekb=1&fs=0`}
                title="Preview"
                allow="autoplay; encrypted-media"
                onLoad={onIframeLoad}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] pointer-events-none"
              />
            </div>
          )}

          {/* Hover veil — a single scrim and one clear action. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 via-40% to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-x-0 bottom-0 p-3 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="flex items-center gap-1.5 text-[11px] text-white/80 font-medium">
              <span>
                <Star className="inline size-3 fill-current -mt-0.5 mr-0.5" />
                {score.toFixed(1)}
              </span>
              <span className="text-white/30">·</span>
              <span>{year || "—"}</span>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white text-black font-semibold">
              <Play className="size-3 fill-black" />
              Watch
            </div>
          </div>
        </div>

        {/* Below-poster meta. */}
        <div className="mt-2.5 px-0.5">
          <div className="text-[0.8125rem] font-medium leading-snug line-clamp-1 text-white/90 group-hover:text-white transition-colors">
            {title}
          </div>
          <div className="text-[0.6875rem] text-[var(--color-muted)] mt-0.5">
            {type === "movie" ? "Movie" : "TV"} · {year || "—"}
          </div>
        </div>
      </Link>
    </m.div>
  );
}
