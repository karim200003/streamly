"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Play,
  Info,
  Star,
  ChevronLeft,
  ChevronRight,
  Pause,
} from "lucide-react";
import type { MediaSummary } from "@/features/catalog/domain";
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
      className="relative -mt-16 h-[85vh] min-h-[600px] w-full overflow-hidden group select-none"
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

      {/* Cinematic gradient stack */}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/80 via-40% to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg)] via-[var(--color-bg)]/60 via-30% to-transparent to-70% pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />

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
              <span className="text-[var(--color-accent)]">Featured</span>
              <span className="text-white/20">/</span>
              <span className="text-white/60">
                {type === "movie" ? "Movie" : "Series"}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display italic text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.55)]">
              {title}
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-3 text-sm text-white/80">
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-3.5 text-yellow-400 fill-yellow-400" />
                <span className="font-semibold tabular-nums">
                  {(media.rating ?? 0).toFixed(1)}
                </span>
              </span>
              {year && (
                <>
                  <span className="size-1 rounded-full bg-white/25" />
                  <span className="tabular-nums">{year}</span>
                </>
              )}
              <span className="size-1 rounded-full bg-white/25" />
              <span className="uppercase text-xs tracking-widest text-white/50">
                {type === "movie" ? "Movie" : "Series"}
              </span>
            </div>

            {/* Overview */}
            <p className="text-base sm:text-[1.05rem] text-white/80 line-clamp-3 max-w-xl leading-relaxed">
              {media.overview}
            </p>

            {/* CTAs */}
            <div className="flex items-center gap-3 pt-3">
              <Link
                href={`/watch/${type}/${media.id}`}
                className="group/btn inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-white text-black font-semibold hover:bg-white/95 active:scale-[0.97] transition-all shadow-[0_8px_30px_-4px_rgba(255,255,255,0.3)]"
              >
                <Play className="size-4 fill-black transition-transform group-hover/btn:scale-110" />
                Play
              </Link>
              <Link
                href={media.href}
                className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full glass hover:bg-white/10 active:scale-[0.97] transition-all"
              >
                <Info className="size-4" />
                More info
              </Link>
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
          "absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20",
          "size-11 grid place-items-center rounded-full glass border border-white/10",
          "transition-all duration-300",
          "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0",
          "hover:bg-white/15 active:scale-95",
        )}
        aria-label="Next slide"
      >
        <ChevronRight className="size-5" />
      </button>

      {/* ── Bottom controls ───────────────────────────────────────── */}
      <div className="absolute bottom-8 right-6 sm:right-10 z-20 flex items-center gap-4">
        {/* Pause/resume. Keyboard-reachable, unlike the hover pause —
            WCAG 2.2.2 requires a way to stop auto-updating content. */}
        {!reducedMotion && (
          <button
            onClick={() => setUserPaused((v) => !v)}
            aria-label={
              userPaused ? "Resume auto-rotation" : "Pause auto-rotation"
            }
            aria-pressed={userPaused}
            className="size-8 grid place-items-center rounded-full glass border border-white/10 hover:bg-white/15 transition"
          >
            {userPaused ? (
              <Play className="size-3.5 fill-current" />
            ) : (
              <Pause className="size-3.5" />
            )}
          </button>
        )}

        {/* Segmented progress indicators */}
        <div className="flex items-center gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1} of ${items.length}`}
              aria-current={i === current}
              className={cn(
                "relative h-[3px] rounded-full overflow-hidden transition-all duration-300 bg-white/20",
                i === current ? "w-10" : "w-3.5 hover:bg-white/40",
              )}
            >
              {/* Completed slides */}
              {i < current && (
                <span className="absolute inset-0 bg-white/70 rounded-full" />
              )}
              {/* Active slide progress */}
              {i === current && (
                <span
                  className="absolute inset-y-0 left-0 bg-white rounded-full"
                  style={{ width: `${progress}%` }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Slide counter */}
        <span className="text-[11px] font-medium tabular-nums text-white/40 tracking-wider hidden sm:block">
          {String(current + 1).padStart(2, "0")}&thinsp;/&thinsp;{String(items.length).padStart(2, "0")}
        </span>
      </div>
    </section>
  );
}
