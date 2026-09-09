// SERVER-SIDE ONLY data fetchers for TMDB. Reads the user's chosen
// language from cookies (next/headers), so this module must never be
// imported by Client Components — they should import from
// `./tmdb-shared` instead.
//
// Re-exports the shared types/constants for the convenience of
// existing server-component imports.

import { getServerLang } from "./locale-server";
import { logger } from "./logger";
import { imageUrl as buildImageUrl } from "./tmdb-shared";
import {
  WATCH_PROVIDERS,
  WATCH_REGION,
  type ResolvedProvider,
} from "./providers";
import type {
  MediaType,
  TmdbMedia,
  TmdbDetails,
  TmdbEpisode,
} from "./tmdb-shared";

export type {
  MediaType,
  TmdbMedia,
  TmdbDetails,
  TmdbSeason,
  TmdbEpisode,
  TmdbVideo,
  TmdbCast,
  TmdbCrew,
} from "./tmdb-shared";
export {
  imageUrl,
  getTitle,
  getReleaseYear,
  getMediaType,
  MOVIE_GENRES,
  TV_GENRES,
  getGenreName,
} from "./tmdb-shared";

const log = logger("tmdb");

const TMDB_BASE = "https://api.themoviedb.org/3";

/**
 * Upstream calls are on the critical path of every catalog render, so
 * they get a hard ceiling. Without one, a TMDB stall holds the request
 * open until the platform's own (much longer) timeout kills it, and one
 * slow dependency becomes a site-wide outage.
 */
const TMDB_TIMEOUT_MS = 8_000;

/** Thrown when TMDB itself fails, so callers can degrade deliberately. */
export class TmdbError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "TmdbError";
  }
}

interface TmdbList<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const HAS_KEY = !!TMDB_API_KEY;

async function tmdb<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  revalidate = 60 * 60,
): Promise<T> {
  // Narrowing the module-level const (rather than re-reading process.env)
  // lets TypeScript prove the key is present, so no non-null assertion.
  if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY missing");
  const lang = await getServerLang();

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  url.searchParams.set("language", lang);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  let res: Response;
  try {
    res = await fetch(url, {
      next: { revalidate },
      signal: AbortSignal.timeout(TMDB_TIMEOUT_MS),
    });
  } catch (err) {
    // AbortError (timeout) and network failures land here.
    throw new TmdbError(
      `TMDB request failed for ${path}: ${
        err instanceof Error ? err.message : "unknown error"
      }`,
    );
  }

  if (!res.ok) {
    throw new TmdbError(
      `TMDB ${res.status} ${res.statusText} for ${path}`,
      res.status,
    );
  }
  return res.json() as Promise<T>;
}

export const tmdbAvailable = HAS_KEY;

export async function getTrending(window: "day" | "week" = "week") {
  if (!HAS_KEY) return mock.trending;
  const data = await tmdb<TmdbList<TmdbMedia>>(`/trending/all/${window}`);
  return data.results;
}

export async function getPopularMovies() {
  if (!HAS_KEY) return mock.popularMovies;
  const data = await tmdb<TmdbList<TmdbMedia>>("/movie/popular");
  return data.results.map((m) => ({ ...m, media_type: "movie" as const }));
}

export async function getPopularTv() {
  if (!HAS_KEY) return mock.popularTv;
  const data = await tmdb<TmdbList<TmdbMedia>>("/tv/popular");
  return data.results.map((m) => ({ ...m, media_type: "tv" as const }));
}

export async function getTopRatedMovies() {
  if (!HAS_KEY) return mock.popularMovies;
  const data = await tmdb<TmdbList<TmdbMedia>>("/movie/top_rated");
  return data.results.map((m) => ({ ...m, media_type: "movie" as const }));
}

export async function getDetails(type: MediaType, id: number) {
  if (!HAS_KEY) return mock.details(type, id);
  return tmdb<TmdbDetails>(`/${type}/${id}`, {
    append_to_response: "videos,credits,similar",
  });
}

/**
 * Lighter variant used on the /watch page, which only needs title +
 * poster + a few meta fields. Skips the `append_to_response` payload
 * (credits/videos/similar) that the details page needs — roughly half
 * the response size and one round-trip on TMDB's side.
 */
export async function getBasicDetails(type: MediaType, id: number) {
  if (!HAS_KEY) return mock.details(type, id);
  return tmdb<TmdbDetails>(`/${type}/${id}`);
}

/** Similar titles from a details payload (avoids a second TMDB request). */
export function similarFromDetails(
  details: TmdbDetails,
  mediaType: MediaType,
): TmdbMedia[] {
  const results = details.similar?.results;
  if (!results?.length) return [];
  return results
    .filter((m) => m.id != null)
    .map((m) => ({
      ...m,
      media_type:
        m.media_type === "movie" || m.media_type === "tv"
          ? m.media_type
          : mediaType,
    }));
}

export async function getSeason(tvId: number, seasonNumber: number) {
  if (!HAS_KEY) {
    return {
      season_number: seasonNumber,
      episodes: [] as TmdbEpisode[],
      name: `Season ${seasonNumber}`,
    };
  }
  return tmdb<{ season_number: number; episodes: TmdbEpisode[]; name: string }>(
    `/tv/${tvId}/season/${seasonNumber}`,
  );
}

export interface DiscoverOptions {
  genreId?: number;
  year?: number;
  minRating?: number;
  sortBy?: string;
  page?: number;
  /** TMDB `provider_id` — powers the "Browse by Provider" tiles. */
  providerId?: number;
}

export async function discover(
  type: MediaType,
  opts: DiscoverOptions = {},
) {
  const params: Record<string, string | number | undefined> = {
    sort_by: opts.sortBy ?? "popularity.desc",
    page: opts.page ?? 1,
    "vote_count.gte": 50,
  };
  if (opts.genreId) params.with_genres = opts.genreId;
  // TMDB ignores `with_watch_providers` unless a region accompanies it,
  // and silently returns the unfiltered catalogue — which looks like the
  // filter working on a popular provider and is easy to miss.
  if (opts.providerId) {
    params.with_watch_providers = opts.providerId;
    params.watch_region = WATCH_REGION;
  }
  if (opts.minRating) params["vote_average.gte"] = opts.minRating;
  if (opts.year) {
    if (type === "movie") params.primary_release_year = opts.year;
    else params.first_air_date_year = opts.year;
  }

  if (!HAS_KEY) {
    return {
      results: (type === "movie" ? mock.popularMovies : mock.popularTv).map(
        (m) => ({ ...m, media_type: type }),
      ),
      page: 1,
      total_pages: 1,
      total_results: mock.popularMovies.length,
    };
  }

  const data = await tmdb<TmdbList<TmdbMedia>>(`/discover/${type}`, params);
  return {
    ...data,
    results: data.results.map((m) => ({ ...m, media_type: type })),
  };
}

export async function getTrendingSearches() {
  if (!HAS_KEY) return mock.trending.slice(0, 8);
  const data = await tmdb<TmdbList<TmdbMedia>>("/trending/all/day");
  return data.results
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 8);
}

export async function search(query: string, page = 1) {
  if (!query.trim()) return [];
  if (!HAS_KEY) {
    return mock.trending.filter((m) =>
      (m.title ?? m.name ?? "").toLowerCase().includes(query.toLowerCase()),
    );
  }
  const data = await tmdb<TmdbList<TmdbMedia>>(
    "/search/multi",
    { query, page },
    0,
  );
  return data.results.filter(
    (r) => r.media_type === "movie" || r.media_type === "tv",
  );
}

/**
 * How many pages of `/search/multi` to pull before filtering.
 *
 * TMDB's multi-search accepts no genre/year/rating parameters, so those
 * filters have to be applied after the fact. Pulling a single page (the
 * old client-side behaviour) meant a filter could hide every result and
 * report "no matches" for titles that plainly exist. Widening the pool
 * makes that far rarer; going much beyond this just burns quota.
 */
const SEARCH_POOL_PAGES = 3;

/**
 * Multi-search across several pages, de-duplicated.
 *
 * Pages are fetched concurrently — they don't depend on each other, and
 * TMDB returns a stable ordering for a given query.
 */
export async function searchPool(query: string): Promise<TmdbMedia[]> {
  if (!query.trim()) return [];

  const pages = await Promise.all(
    Array.from({ length: SEARCH_POOL_PAGES }, (_, i) =>
      search(query, i + 1).catch(() => [] as TmdbMedia[]),
    ),
  );

  const seen = new Set<string>();
  const out: TmdbMedia[] = [];
  for (const result of pages.flat()) {
    const key = `${result.media_type}-${result.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(result);
  }
  return out;
}

/**
 * Resolve each curated provider to the logo TMDB currently serves.
 *
 * The logo paths are content-hashed and change without notice, so they
 * are fetched rather than hardcoded. Cached for a day — the list is
 * effectively static, and this runs on every home render.
 *
 * Degrades to `logoUrl: null` (the tile falls back to a wordmark) on
 * any failure: a provider row is not worth failing the page over.
 */
export async function getProviderLogos(): Promise<ResolvedProvider[]> {
  const withoutLogos = () =>
    WATCH_PROVIDERS.map((p) => ({ ...p, logoUrl: null }));

  if (!HAS_KEY) return withoutLogos();

  try {
    const data = await tmdb<{
      results: { provider_id: number; logo_path: string | null }[];
    }>("/watch/providers/movie", { watch_region: WATCH_REGION }, 60 * 60 * 24);

    const byId = new Map(
      data.results.map((r) => [r.provider_id, r.logo_path] as const),
    );
    return WATCH_PROVIDERS.map((p) => ({
      ...p,
      logoUrl: buildImageUrl(byId.get(p.id) ?? null, "original"),
    }));
  } catch (err) {
    log.warn("watch provider logos unavailable", { err: String(err) });
    return withoutLogos();
  }
}

const PLACEHOLDER_BACKDROP = null;

const mock = {
  trending: Array.from({ length: 10 }).map((_, i) => ({
    id: 1000 + i,
    title: `Demo Movie ${i + 1}`,
    overview:
      "A placeholder description. Set TMDB_API_KEY in .env to load real data.",
    poster_path: PLACEHOLDER_BACKDROP,
    backdrop_path: PLACEHOLDER_BACKDROP,
    vote_average: 7 + (i % 3),
    release_date: "2024-01-01",
    media_type: "movie" as const,
  })) as TmdbMedia[],
  popularMovies: Array.from({ length: 10 }).map((_, i) => ({
    id: 2000 + i,
    title: `Popular Movie ${i + 1}`,
    overview: "Placeholder.",
    poster_path: PLACEHOLDER_BACKDROP,
    backdrop_path: PLACEHOLDER_BACKDROP,
    vote_average: 6 + (i % 4),
    release_date: "2024-01-01",
    media_type: "movie" as const,
  })) as TmdbMedia[],
  popularTv: Array.from({ length: 10 }).map((_, i) => ({
    id: 3000 + i,
    name: `Popular Show ${i + 1}`,
    overview: "Placeholder.",
    poster_path: PLACEHOLDER_BACKDROP,
    backdrop_path: PLACEHOLDER_BACKDROP,
    vote_average: 7 + (i % 3),
    first_air_date: "2024-01-01",
    media_type: "tv" as const,
  })) as TmdbMedia[],
  details(type: MediaType, id: number): TmdbDetails {
    return {
      id,
      title: type === "movie" ? `Demo Movie ${id}` : undefined,
      name: type === "tv" ? `Demo Show ${id}` : undefined,
      overview:
        "Demo content. Add TMDB_API_KEY in .env to load real metadata, posters, cast, and similar titles.",
      poster_path: null,
      backdrop_path: null,
      vote_average: 7.5,
      release_date: "2024-01-01",
      first_air_date: "2024-01-01",
      runtime: type === "movie" ? 120 : undefined,
      episode_run_time: type === "tv" ? [45] : undefined,
      genres: [
        { id: 28, name: "Action" },
        { id: 18, name: "Drama" },
      ],
      number_of_seasons: type === "tv" ? 2 : undefined,
      seasons:
        type === "tv"
          ? [
              {
                id: 1,
                name: "Season 1",
                season_number: 1,
                episode_count: 8,
                poster_path: null,
                overview: "",
                air_date: "2024-01-01",
              },
            ]
          : [],
      videos: { results: [] },
      credits: { cast: [], crew: [] },
      similar: {
        results: (type === "movie" ? mock.popularMovies : mock.popularTv).slice(
          0,
          8,
        ),
      },
    };
  },
};
