"use client";

import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, TrendingUp, Filter } from "lucide-react";
import MovieCard from "@/components/MovieCard";
import { CardSkeleton } from "@/components/Skeletons";
import { type TmdbMedia, MOVIE_GENRES, TV_GENRES } from "@/lib/tmdb-shared";
import { cn } from "@/lib/utils";

type TypeFilter = "all" | "movie" | "tv";

const TYPE_OPTS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV" },
];

const RATING_OPTS = [
  { value: "", label: "Any rating" },
  { value: "5", label: "5+" },
  { value: "6", label: "6+" },
  { value: "7", label: "7+" },
  { value: "8", label: "8+" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState<TmdbMedia[]>([]);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [genreId, setGenreId] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [rating, setRating] = useState<string>("");

  useEffect(() => {
    fetch("/api/trending-searches")
      .then((r) => r.json())
      .then((d) => setTrending(d.results ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: ctrl.signal,
        });
        const d = await r.json();
        setResults(d.results ?? []);
      } catch {
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query]);

  const onChange = (v: string) => {
    setQuery(v);
    if (!v.trim()) setResults([]);
  };

  // TMDB /search/multi doesn't accept genre/year/rating params, so we
  // filter client-side after the fact. Tradeoff: we may return fewer
  // results than the user might expect, but the UX is instant.
  const filtered = useMemo(() => {
    let xs = results;
    if (typeFilter !== "all") {
      xs = xs.filter((m) => (m.media_type ?? (m.title ? "movie" : "tv")) === typeFilter);
    }
    if (genreId) {
      const id = Number(genreId);
      xs = xs.filter((m) => m.genre_ids?.includes(id) ?? false);
    }
    if (year) {
      const y = year;
      xs = xs.filter((m) => {
        const d = m.release_date ?? m.first_air_date ?? "";
        return d.startsWith(y);
      });
    }
    if (rating) {
      const r = Number(rating);
      xs = xs.filter((m) => (m.vote_average ?? 0) >= r);
    }
    return xs;
  }, [results, typeFilter, genreId, year, rating]);

  const genres = useMemo(() => {
    if (typeFilter === "tv") return TV_GENRES;
    if (typeFilter === "movie") return MOVIE_GENRES;
    // "All" — merge by id, prefer movie names
    const merged = new Map<number, string>();
    for (const g of TV_GENRES) merged.set(g.id, g.name);
    for (const g of MOVIE_GENRES) merged.set(g.id, g.name);
    return Array.from(merged, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [typeFilter]);

  const showTrending = !query.trim();
  const hasFilters = typeFilter !== "all" || !!genreId || !!year || !!rating;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 60 }, (_, i) => currentYear - i);

  const selectClass =
    "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 hover:bg-white/10 transition";

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8">
      <div className="mx-auto max-w-screen-2xl">
        <h1 className="font-display italic text-4xl sm:text-5xl tracking-tight text-white">
          Search
        </h1>
        <p className="text-[var(--color-muted)] mt-1">
          Find movies and shows by title, then filter by genre, year, and rating.
        </p>
        <div className="mt-6 relative max-w-xl">
          <SearchIcon className="size-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
          <input
            autoFocus
            value={query}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search for a movie or show…"
            className="w-full pl-12 pr-4 py-3 rounded-xl glass focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-white/40"
          />
        </div>

        {!showTrending && (
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wide text-[var(--color-muted)]">
              <Filter className="size-3.5" /> Filters
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg overflow-hidden border border-white/10 bg-white/5">
                {TYPE_OPTS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTypeFilter(opt.value);
                      setGenreId(""); // genre id meaning differs by type
                    }}
                    className={cn(
                      "px-3 py-2 text-sm transition",
                      typeFilter === opt.value
                        ? "bg-white text-black"
                        : "hover:bg-white/10",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <select
                value={genreId}
                onChange={(e) => setGenreId(e.target.value)}
                className={selectClass}
                aria-label="Genre"
              >
                <option value="">Any genre</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={selectClass}
                aria-label="Year"
              >
                <option value="">Any year</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className={selectClass}
                aria-label="Minimum rating"
              >
                {RATING_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {hasFilters && (
                <button
                  onClick={() => {
                    setTypeFilter("all");
                    setGenreId("");
                    setYear("");
                    setRating("");
                  }}
                  className="text-sm text-[var(--color-muted)] hover:text-white px-2"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-8">
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          )}
          {!loading && !showTrending && (
            <>
              {filtered.length === 0 ? (
                <p className="text-[var(--color-muted)]">
                  {results.length === 0
                    ? "No results found."
                    : `No results match those filters (${results.length} hidden).`}
                </p>
              ) : (
                <>
                  <p className="text-sm text-[var(--color-muted)] mb-3">
                    {filtered.length} {filtered.length === 1 ? "result" : "results"}
                    {filtered.length !== results.length && (
                      <span> · {results.length - filtered.length} hidden by filters</span>
                    )}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {filtered.map((m) => (
                      <MovieCard key={`${m.id}-${m.media_type}`} media={m} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          {!loading && showTrending && trending.length > 0 && (
            <div>
              <h2 className="inline-flex items-center gap-2 text-sm font-medium text-white/80 uppercase tracking-wide mb-4">
                <TrendingUp className="size-4 text-[var(--color-accent)]" />
                Trending today
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {trending.map((m) => (
                  <MovieCard key={`${m.id}-${m.media_type}`} media={m} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
