"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MovieCard from "./MovieCard";
import { cn } from "@/lib/utils";
import type { TmdbMedia } from "@/lib/tmdb-shared";

interface CarouselProps {
  title: string;
  items: TmdbMedia[];
  priority?: boolean;
  /** Use the display serif for the section heading. */
  fancy?: boolean;
}

export default function Carousel({ title, items, priority, fancy }: CarouselProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = () => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      ro.disconnect();
    };
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: "smooth" });
  };

  // Wheel-to-scroll horizontally — desktop power-user move. Only kicks
  // in when the user is over the carousel and uses a vertical wheel
  // gesture (most common on mice). Trackpad horizontal scroll still
  // works natively.
  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    const el = ref.current;
    if (!el) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    el.scrollLeft += e.deltaY;
    e.preventDefault();
  };

  if (!items.length) return null;

  return (
    <section className="px-4 sm:px-6 lg:px-10 py-7">
      <div className="flex items-end justify-between mb-3.5">
        <h2
          className={cn(
            "text-lg sm:text-xl tracking-tight",
            fancy
              ? "font-display italic text-2xl sm:text-3xl text-white"
              : "font-semibold",
          )}
        >
          {title}
        </h2>
        <div className="hidden sm:flex gap-1.5">
          <button
            onClick={() => scroll(-1)}
            disabled={atStart}
            className="size-9 grid place-items-center rounded-full glass hover:bg-white/12 transition disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Scroll left"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            disabled={atEnd}
            className="size-9 grid place-items-center rounded-full glass hover:bg-white/12 transition disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Scroll right"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="relative group/track">
        {/* Edge fade overlays — visible only when content extends in that direction */}
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-12 z-10 bg-gradient-to-r from-[var(--color-bg)] to-transparent transition-opacity duration-300",
            atStart && "opacity-0",
          )}
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-[var(--color-bg)] to-transparent transition-opacity duration-300",
            atEnd && "opacity-0",
          )}
        />

        {/* Hover-only desktop arrows centered on the track. Hidden on
            small screens since the header buttons handle that. */}
        <button
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
          className={cn(
            "hidden md:grid place-items-center absolute left-2 top-1/2 -translate-y-1/2 size-12 rounded-full glass-strong z-20",
            "opacity-0 -translate-x-2 group-hover/track:opacity-100 group-hover/track:translate-x-0 transition-all duration-300",
            "hover:bg-white/15 active:scale-95",
            atStart && "opacity-0 pointer-events-none",
          )}
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          onClick={() => scroll(1)}
          aria-label="Scroll right"
          className={cn(
            "hidden md:grid place-items-center absolute right-2 top-1/2 -translate-y-1/2 size-12 rounded-full glass-strong z-20",
            "opacity-0 translate-x-2 group-hover/track:opacity-100 group-hover/track:translate-x-0 transition-all duration-300",
            "hover:bg-white/15 active:scale-95",
            atEnd && "opacity-0 pointer-events-none",
          )}
        >
          <ChevronRight className="size-5" />
        </button>

        <div
          ref={ref}
          onWheel={onWheel}
          className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-3 scroll-smooth"
        >
          {items.map((m, i) => (
            <div key={`${m.id}-${i}`} className="snap-start">
              <MovieCard media={m} priority={priority && i < 4} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
