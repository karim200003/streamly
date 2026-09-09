// Client + server safe. The single source of truth for TMDB `sort_by`
// values, shared by the FiltersBar UI and the pages that forward the
// `?sort=` param upstream.
//
// The pages previously passed `searchParams.sort` straight through to
// TMDB. FiltersBar only ever emits values from these lists, but a
// hand-crafted URL could send anything, which TMDB answers with a 4xx
// that surfaces as the segment error boundary.

import type { MediaType } from "./tmdb-shared";

export const MOVIE_SORT_OPTIONS = [
  { value: "popularity.desc", label: "Popular" },
  { value: "vote_average.desc", label: "Top rated" },
  { value: "primary_release_date.desc", label: "Newest" },
  { value: "primary_release_date.asc", label: "Oldest" },
] as const;

export const TV_SORT_OPTIONS = [
  { value: "popularity.desc", label: "Popular" },
  { value: "vote_average.desc", label: "Top rated" },
  { value: "first_air_date.desc", label: "Newest" },
  { value: "first_air_date.asc", label: "Oldest" },
] as const;

export const DEFAULT_SORT = "popularity.desc";

export function sortOptionsFor(mediaType: MediaType) {
  return mediaType === "tv" ? TV_SORT_OPTIONS : MOVIE_SORT_OPTIONS;
}

/**
 * Narrow an untrusted `?sort=` value to one this media type accepts,
 * falling back to the default rather than rejecting the request.
 */
export function parseSort(mediaType: MediaType, value: unknown): string {
  if (typeof value !== "string") return DEFAULT_SORT;
  const allowed = sortOptionsFor(mediaType);
  return allowed.some((o) => o.value === value) ? value : DEFAULT_SORT;
}

/** Clamp a `?year=` value to a plausible release year. */
export function parseYear(value: unknown): number | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n)) return undefined;
  const max = new Date().getFullYear() + 5;
  return n >= 1874 && n <= max ? n : undefined;
}

/** Clamp a `?rating=` value to TMDB's 0-10 vote average scale. */
export function parseRating(value: unknown): number | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 10) return undefined;
  return n;
}
