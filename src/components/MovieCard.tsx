"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import { Play, Star } from "lucide-react";
import {
  imageUrl,
  type TmdbMedia,
  getTitle,
  getReleaseYear,
  getMediaType,
} from "@/lib/tmdb-shared";
import { cn } from "@/lib/utils";

interface MovieCardProps {
  media: TmdbMedia;
  priority?: boolean;
}

const trailerCache = new Map<string, string | null | Promise<string | null>>();

async function getTrailerKey(
  type: "movie" | "tv",
  id: number,
): Promise<string | null> {
  const k = `${type}-${id}`;
  const hit = trailerCache.get(k);
  if (hit !== undefined) return hit instanceof Promise ? hit : hit;
  const p = fetch(`/api/trailer?tmdbId=${id}&mediaType=${type}`)
    .then((r) => (r.ok ? r.json() : { key: null }))
    .then((d: { key: string | null }) => d.key)
    .catch(() => null);
  trailerCache.set(k, p);
  const result = await p;
  trailerCache.set(k, result);
  return result;
}

function ratingTone(score: number) {
  if (score >= 7.5) return "text-emerald-300";
  if (score >= 6) return "text-yellow-300";
  return "text-orange-300";
}

export default function MovieCard({ media, priority }: MovieCardProps) {
  const title = getTitle(media);
  const year = getReleaseYear(media);
  const type = getMediaType(media);
  const poster = imageUrl(media.poster_path, "w500");
  const score = media.vote_average ?? 0;

  const [hoverArmed, setHoverArmed] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerVisible, setTrailerVisible] = useState(false);
  const armTimerRef = useRef<number | null>(null);
  const swapTimerRef = useRef<number | null>(null);
  // Generation counter — every onEnter bumps it so a late async fetch
  // from a previous hover can't mutate state for the current one.
  const genRef = useRef(0);

  const previewEnabled =
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
    if (!previewEnabled) return;
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
      className="group relative shrink-0 w-[160px] sm:w-[180px] md:w-[200px]"
    >
      <Link href={`/${type}/${media.id}`} className="block">
        {/* Poster surface — soft outer glow on hover via ring + brightness, plus an accent tint shadow. */}
        <div
          className={cn(
            "relative aspect-[2/3] rounded-xl overflow-hidden bg-[var(--color-bg-2)]",
            "border border-white/5 transition-all duration-300",
            "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]",
            "group-hover:shadow-[0_16px_40px_-12px_rgba(239,68,68,0.35),0_8px_20px_-6px_rgba(0,0,0,0.6)]",
            "group-hover:ring-2 group-hover:ring-white/20",
            "group-hover:border-white/15",
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
                "group-hover:scale-[1.08]",
                hidePoster && "opacity-0 scale-110",
              )}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-xs text-[var(--color-muted)] p-4 text-center">
              {title}
            </div>
          )}

          {/* Floating score chip — top-left, always visible (Apple TV+ style). */}
          {score > 0 && (
            <span
              className={cn(
                "absolute top-2 left-2 chip",
                "transition-all duration-300",
                "group-hover:opacity-0 group-hover:-translate-y-1",
                ratingTone(score),
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

          {/* Bottom info veil — appears on hover. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 via-30% to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-x-0 bottom-0 p-3 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="flex items-center gap-1.5 text-[11px] text-white/85 uppercase tracking-wide font-semibold">
              <span className={ratingTone(score)}>
                <Star className="inline size-3 fill-current -mt-0.5 mr-0.5" />
                {score.toFixed(1)}
              </span>
              <span className="text-white/40">·</span>
              <span>{year || "—"}</span>
              <span className="text-white/40">·</span>
              <span>{type === "movie" ? "Movie" : "TV"}</span>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/95 text-black font-semibold">
              <Play className="size-3 fill-black" />
              Watch
            </div>
          </div>
        </div>

        {/* Below-poster meta. Title goes white on hover (subtle but felt). */}
        <div className="mt-2.5 px-0.5">
          <div className="text-sm font-medium leading-snug line-clamp-1 text-white/90 group-hover:text-white transition-colors">
            {title}
          </div>
          <div className="text-xs text-[var(--color-muted)] mt-0.5">
            {type === "movie" ? "Movie" : "TV"} · {year || "—"}
          </div>
        </div>
      </Link>
    </m.div>
  );
}
