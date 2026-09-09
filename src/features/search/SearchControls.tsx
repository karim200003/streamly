"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TYPE_OPTIONS,
  RATING_OPTIONS,
  YEAR_OPTIONS,
  genresFor,
  hasActiveFilters,
  type SearchFilters,
} from "./filters";

const SELECT_CLASS =
  "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 hover:bg-white/10 transition disabled:opacity-50";

/** Debounce before pushing the query into the URL. */
const TYPING_DELAY_MS = 350;

/**
 * The search form. Owns no results — it only writes the URL, and the
 * server component re-renders from it. That makes every search
 * shareable, bookmarkable and back-button friendly, none of which worked
 * when this state lived in useState.
 */
export default function SearchControls({
  filters,
}: {
  filters: SearchFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Local mirror so typing stays responsive while the URL catches up.
  const [q, setQ] = useState(filters.q);
  const typingTimer = useRef<number | null>(null);

  // Clear any pending debounce when unmounting.
  useEffect(
    () => () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    },
    [],
  );

  const push = (next: Partial<SearchFilters>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, String(value));
      else sp.delete(key);
    }
    // Changing the type changes what genre ids mean.
    if (next.type !== undefined) sp.delete("genre");
    startTransition(() => {
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    });
  };

  const onQueryChange = (value: string) => {
    setQ(value);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(
      () => push({ q: value }),
      TYPING_DELAY_MS,
    );
  };

  const showFilters = !!filters.q;

  return (
    <>
      <div className="mt-6 relative max-w-xl">
        <SearchIcon className="size-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
        <label htmlFor="search-input" className="sr-only">
          Search for a movie or show
        </label>
        <input
          id="search-input"
          type="search"
          value={q}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search for a movie or show…"
          className="w-full pl-12 pr-4 py-3 rounded-xl glass focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-white/40"
        />
      </div>

      {showFilters && (
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wide text-[var(--color-muted)]">
            <Filter className="size-3.5" /> Filters
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg overflow-hidden border border-white/10 bg-white/5">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => push({ type: opt.value })}
                  disabled={pending}
                  aria-pressed={filters.type === opt.value}
                  className={cn(
                    "px-3 py-2 text-sm transition disabled:opacity-50",
                    filters.type === opt.value
                      ? "bg-white text-black"
                      : "hover:bg-white/10",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <select
              value={filters.genre}
              onChange={(e) => push({ genre: e.target.value })}
              disabled={pending}
              className={SELECT_CLASS}
              aria-label="Genre"
            >
              <option value="">Any genre</option>
              {genresFor(filters.type).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            <select
              value={filters.year}
              onChange={(e) => push({ year: e.target.value })}
              disabled={pending}
              className={SELECT_CLASS}
              aria-label="Year"
            >
              <option value="">Any year</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={filters.rating}
              onChange={(e) => push({ rating: e.target.value })}
              disabled={pending}
              className={SELECT_CLASS}
              aria-label="Minimum rating"
            >
              {RATING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {hasActiveFilters(filters) && (
              <button
                onClick={() =>
                  push({ type: "all", genre: "", year: "", rating: "" })
                }
                disabled={pending}
                className="text-sm text-[var(--color-muted)] hover:text-white px-2 disabled:opacity-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
