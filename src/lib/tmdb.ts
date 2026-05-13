// SERVER-SIDE ONLY data fetchers for TMDB. Reads the user's chosen
// language from cookies (next/headers), so this module must never be
// imported by Client Components — they should import from
// `./tmdb-shared` instead.
//
// Re-exports the shared types/constants for the convenience of
// existing server-component imports.

import { getServerLang } from "./locale-server";
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

const TMDB_BASE = "https://api.themoviedb.org/3";

interface TmdbList<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

const HAS_KEY = !!process.env.TMDB_API_KEY;

async function tmdb<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  revalidate = 60 * 60,
): Promise<T> {
  if (!HAS_KEY) throw new Error("TMDB_API_KEY missing");
  const lang = await getServerLang();

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", process.env.TMDB_API_KEY!);
  url.searchParams.set("language", lang);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) {
    throw new Error(`TMDB ${res.status} ${res.statusText} for ${path}`);
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

export async function getSimilar(type: MediaType, id: number) {
  if (!HAS_KEY) return mock.popularMovies;
  const data = await tmdb<TmdbList<TmdbMedia>>(`/${type}/${id}/similar`);
  return data.results.map((m) => ({ ...m, media_type: type }));
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

export async function search(query: string) {
  if (!query.trim()) return [];
  if (!HAS_KEY) {
    return mock.trending.filter((m) =>
      (m.title ?? m.name ?? "").toLowerCase().includes(query.toLowerCase()),
    );
  }
  const data = await tmdb<TmdbList<TmdbMedia>>("/search/multi", { query }, 0);
  return data.results.filter(
    (r) => r.media_type === "movie" || r.media_type === "tv",
  );
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
