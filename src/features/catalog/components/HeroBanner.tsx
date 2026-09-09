"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Play,
  Info,
  Star,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Pause,
} from "lucide-react";
import type { MediaSummary } from "@/features/catalog/domain";
import FavoriteButton from "@/features/favorites/components/FavoriteButton";
import { cn } from "@/lib/utils";

interface Props {
  items: MediaSummary[];
}

const SLIDE_DURATION = 7000;

export default function HeroBanner({ items }: Props) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  // Explicit user pause, independent of the transient hover pause.
  const [userPaused, setUserPaused] = useState(false);
  const reducedMotion = useReducedMotion() ?? false;

  const accumulatedRef = useRef(0);
  const touchX = useRef(0);

  const media = items[current];
  const { title, year, mediaType: type, backdropUrl: backdrop } = media;

  // Auto-advance with resumable progress tracking via RAF.
  //
  // Honours prefers-reduced-motion and the explicit pause control below:
  // a carousel that rotates every 7s with no way to stop it is a WCAG
  // 2.2.2 failure, and pausing on hover alone leaves out keyboard and
  // screen-reader users entirely.
  useEffect(() => {
    if (paused || userPaused || reducedMotion) return;

    const startTime = Date.now() - accumulatedRef.current;
    let rafId: number;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / SLIDE_DURATION) * 100, 100);
      setProgress(pct);
      accumulatedRef.current = elapsed;

      if (elapsed >= SLIDE_DURATION) {
        accumulatedRef.current = 0;
        setCurrent((c) => (c + 1) % items.length);
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [current, paused, userPaused, reducedMotion, items.length]);

  const goTo = useCallback((index: number) => {
    accumulatedRef.current = 0;
    setCurrent(index);
  }, []);

  const prev = () => goTo((current - 1 + items.length) % items.length);
  const next = () => goTo((current + 1) % items.length);

  if (!media) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured titles"
      className="relative -mt-[var(--nav-h)] h-[85vh] min-h-[600px] w-full overflow-hidden group select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
      }}
    >
      {/* ── Backdrop ─────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        <m.div
          key={current}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.0, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          {backdrop && (
            <Image
              src={backdrop}
              alt={title}
              fill
              priority={current === 0}
              sizes="100vw"
              className="object-cover"
            />
          )}
        </m.div>
      </AnimatePresence>

      {/* Two scrims: one to seat the copy at the bottom, one across the
          left for legibility. The previous stack layered three gradients
          plus an SVG noise overlay, which dulled the artwork. */}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/55 via-45% to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 via-45% to-transparent pointer-events-none" />

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-screen-2xl h-full px-4 sm:px-6 lg:px-10 flex flex-col justify-end pb-24 pt-24">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={current}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
            className="max-w-2xl space-y-4"
          >
            {/* Badge */}
            <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] uppercase">
              <span className="text-white/85">Featured</span>
              <span className="text-white/20">/</span>
              <span className="text-white/55">
                {type === "movie" ? "Movie" : "Series"}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.02] tracking-[-0.03em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.5)]">
              {title}
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-3 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-4 fill-current" />
                <span className="font-semibold tabular-nums">
                  {(media.rating ?? 0).toFixed(1)}
                  <span className="text-white/55 font-normal">/10</span>
                </span>
              </span>
              {year && (
                <>
                  <span className="size-1 rounded-full bg-white/25" />
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-4" />
                    <span className="tabular-nums">{year}</span>
                  </span>
                </>
              )}
              <span className="size-1 rounded-full bg-white/25" />
              <span>{type === "movie" ? "Movie" : "Series"}</span>
            </div>

            {/* Overview */}
            <p className="text-base sm:text-[1.05rem] text-white/80 line-clamp-3 max-w-xl leading-relaxed">
              {media.overview}
            </p>

            {/* CTAs — one solid primary, then icon-only secondaries
                sharing a single frosted surface. Text buttons here
                competed with the title for attention. */}
            <div className="flex items-center gap-3 pt-3">
              <Link
                href={`/watch/${type}/${media.id}`}
                className="btn-primary px-7 py-3 text-base"
              >
                <Play className="size-4 fill-black" />
                Play
              </Link>
              <div className="icon-group">
                <FavoriteButton
                  variant="icon"
                  tmdbId={media.id}
                  mediaType={type}
                  title={title}
                  posterPath={media.posterPath}
                />
                <Link href={media.href} aria-label={`More info about ${title}`}>
                  <Info className="size-[1.15rem]" />
                </Link>
              </div>
            </div>
          </m.div>
        </AnimatePresence>
      </div>

      {/* ── Prev / Next arrows (reveal on hover) ─────────────────── */}
      <button
        onClick={prev}
        className={cn(
          "absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20",
          "size-11 grid place-items-center rounded-full glass border border-white/10",
          "transition-all duration-300",
          "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0",
          "hover:bg-white/15 active:scale-95",
        )}
        aria-label="Previous slide"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        onClick={next}
        className={cn(
          // Cleared to the left of the position indicator, which now
          // owns the hero's right edge.
          "absolute right-14 sm:right-16 lg:right-20 top-1/2 -translate-y-1/2 z-20",
          "size-11 grid place-items-center rounded-full glass border border-white/10",
          "transition-all duration-300",
          "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0",
          "hover:bg-white/15 active:scale-95",
        )}
        aria-label="Next slide"
      >
        <ChevronRight className="size-5" />
      </button>

      {/* ── Position indicator ────────────────────────────────────── */}
      {/* Pinned to the hero's right edge and vertically centred, so it
          reads as a scrollbar for the carousel rather than another
          element competing with the copy in the bottom-left. */}
      <div className="absolute right-4 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
        <div className="flex flex-col items-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1} of ${items.length}`}
              aria-current={i === current}
              className={cn(
                "relative w-[3px] rounded-full overflow-hidden transition-all duration-300 bg-white/25",
                i === current ? "h-8" : "h-3 hover:bg-white/50",
              )}
            >
              {/* Completed slides */}
              {i < current && (
                <span className="absolute inset-0 bg-white/70 rounded-full" />
              )}
              {/* Active slide fills top-to-bottom as its time elapses. */}
              {i === current && (
                <span
                  className="absolute inset-x-0 top-0 bg-white rounded-full"
                  style={{ height: `${progress}%` }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Pause/resume. Keyboard-reachable, unlike the hover pause —
            WCAG 2.2.2 requires a way to stop auto-updating content.
            Absolutely positioned so it hangs below the indicator without
            pulling the dots off the vertical centre. */}
        {!reducedMotion && (
          <button
            onClick={() => setUserPaused((v) => !v)}
            aria-label={
              userPaused ? "Resume auto-rotation" : "Pause auto-rotation"
            }
            aria-pressed={userPaused}
            className="absolute top-full mt-4 size-8 grid place-items-center rounded-full glass border border-white/10 hover:bg-white/15 transition"
          >
            {userPaused ? (
              <Play className="size-3.5 fill-current" />
            ) : (
              <Pause className="size-3.5" />
            )}
          </button>
        )}
      </div>

    </section>
  );
}
