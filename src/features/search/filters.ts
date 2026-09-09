// Client + server safe. Shared by the search form and the server page so
// the URL is the single source of truth for search state.

import { MOVIE_GENRES, TV_GENRES, type TmdbMedia } from "@/lib/tmdb-shared";
import { getMediaType } from "@/lib/tmdb-shared";

export type TypeFilter = "all" | "movie" | "tv";

export const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV" },
];

export const RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  { value: "5", label: "5+" },
  { value: "6", label: "6+" },
  { value: "7", label: "7+" },
  { value: "8", label: "8+" },
];

export const YEAR_OPTIONS = Array.from(
  { length: 60 },
  (_, i) => new Date().getFullYear() - i,
);

export interface SearchFilters {
  q: string;
  type: TypeFilter;
  genre: string;
  year: string;
  rating: string;
}

export const EMPTY_FILTERS: SearchFilters = {
  q: "",
  type: "all",
  genre: "",
  year: "",
  rating: "",
};

function asTypeFilter(value: string | undefined): TypeFilter {
  return value === "movie" || value === "tv" ? value : "all";
}

/** Narrow raw searchParams into the filter shape. */
export function parseFilters(sp: {
  q?: string;
  type?: string;
  genre?: string;
  year?: string;
  rating?: string;
}): SearchFilters {
  return {
    q: (sp.q ?? "").slice(0, 200),
    type: asTypeFilter(sp.type),
    genre: sp.genre ?? "",
    year: sp.year ?? "",
    rating: sp.rating ?? "",
  };
}

export function hasActiveFilters(f: SearchFilters): boolean {
  return f.type !== "all" || !!f.genre || !!f.year || !!f.rating;
}

/** Genres offered for the selected type; "all" merges both tables. */
export function genresFor(type: TypeFilter) {
  if (type === "tv") return TV_GENRES;
  if (type === "movie") return MOVIE_GENRES;
  const merged = new Map<number, string>();
  for (const g of TV_GENRES) merged.set(g.id, g.name);
  for (const g of MOVIE_GENRES) merged.set(g.id, g.name);
  return Array.from(merged, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

/**
 * Apply the filters TMDB's multi-search can't express itself.
 *
 * Runs on the server now, over a multi-page pool, rather than in the
 * browser over a single page of results.
 */
export function applyFilters(
  results: TmdbMedia[],
  f: SearchFilters,
): TmdbMedia[] {
  let out = results;
  if (f.type !== "all") {
    out = out.filter((m) => getMediaType(m) === f.type);
  }
  if (f.genre) {
    const id = Number(f.genre);
    out = out.filter((m) => m.genre_ids?.includes(id) ?? false);
  }
  if (f.year) {
    out = out.filter((m) =>
      (m.release_date ?? m.first_air_date ?? "").startsWith(f.year),
    );
  }
  if (f.rating) {
    const min = Number(f.rating);
    out = out.filter((m) => (m.vote_average ?? 0) >= min);
  }
  return out;
}
