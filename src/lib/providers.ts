// The streaming services surfaced in the "Browse by Provider" row.
//
// Client-safe: types and the curated list only. The fetcher that
// resolves each provider's logo lives in `tmdb.ts` (server-only).
//
// IDs are TMDB `provider_id` values. We deliberately keep a curated,
// ordered list rather than rendering whatever TMDB returns first —
// /watch/providers/movie yields well over a hundred entries for the US,
// most of them rental storefronts and niche channels, in an order that
// changes week to week.

export interface WatchProvider {
  /** TMDB `provider_id`, passed to /discover as `with_watch_providers`. */
  id: number;
  /** Our own copy, not TMDB's `provider_name` — kept short for the tile. */
  name: string;
}

export const WATCH_PROVIDERS: WatchProvider[] = [
  { id: 8, name: "Netflix" },
  { id: 9, name: "Prime Video" },
  { id: 337, name: "Disney+" },
  { id: 350, name: "Apple TV+" },
  { id: 15, name: "Hulu" },
  { id: 1899, name: "HBO Max" },
  { id: 531, name: "Paramount+" },
  { id: 386, name: "Peacock" },
  { id: 283, name: "Crunchyroll" },
];

/** A provider plus the logo path TMDB currently serves for it. */
export interface ResolvedProvider extends WatchProvider {
  /** Ready for next/image, or null when TMDB has no logo for this id. */
  logoUrl: string | null;
}

export function findProvider(id: number): WatchProvider | undefined {
  return WATCH_PROVIDERS.find((p) => p.id === id);
}

/**
 * Providers are region-scoped on TMDB: an id that streams in the US may
 * be absent elsewhere, and /discover requires the region alongside the
 * provider. One constant keeps the two calls in agreement.
 */
export const WATCH_REGION = "US";
