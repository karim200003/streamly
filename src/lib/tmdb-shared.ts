// Shared TMDB types + constants safe for both client and server.
// Server-only fetchers live in `tmdb.ts` (which depends on next/headers).
// Client components should import from this file.

export type MediaType = "movie" | "tv";

export interface TmdbMedia {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  media_type?: MediaType;
}

export interface TmdbSeason {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  overview: string;
  air_date: string | null;
}

export interface TmdbEpisode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  overview: string;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
}

export interface TmdbVideo {
  id: string;
  key: string;
  site: string;
  type: string;
  official: boolean;
}

export interface TmdbCast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TmdbCrew {
  id: number;
  name: string;
  job: string;
  department: string;
}

export interface TmdbDetails extends TmdbMedia {
  runtime?: number;
  episode_run_time?: number[];
  genres: { id: number; name: string }[];
  tagline?: string;
  status?: string;
  number_of_seasons?: number;
  seasons?: TmdbSeason[];
  videos?: { results: TmdbVideo[] };
  credits?: { cast: TmdbCast[]; crew: TmdbCrew[] };
  /** Present when fetched with `append_to_response=similar` (see `getDetails`). */
  similar?: { results?: TmdbMedia[] };
}

const IMAGE_BASE_DEFAULT = "https://image.tmdb.org/t/p";

export function imageUrl(
  path: string | null | undefined,
  size:
    | "w200"
    | "w300"
    | "w500"
    | "w780"
    | "w1280"
    | "original" = "w500",
) {
  if (!path) return null;
  const base =
    process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE ?? IMAGE_BASE_DEFAULT;
  return `${base}/${size}${path}`;
}

export function getTitle(m: TmdbMedia) {
  return m.title ?? m.name ?? "Untitled";
}

export function getReleaseYear(m: TmdbMedia) {
  return (m.release_date ?? m.first_air_date ?? "").slice(0, 4);
}

export function getMediaType(m: TmdbMedia): MediaType {
  return (m.media_type ?? (m.title ? "movie" : "tv")) as MediaType;
}

// TMDB official genre IDs. Hardcoded to avoid an extra round-trip per render.
export const MOVIE_GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Science Fiction" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" },
] as const;

export const TV_GENRES = [
  { id: 10759, name: "Action & Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 10762, name: "Kids" },
  { id: 9648, name: "Mystery" },
  { id: 10763, name: "News" },
  { id: 10764, name: "Reality" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 10766, name: "Soap" },
  { id: 10767, name: "Talk" },
  { id: 10768, name: "War & Politics" },
  { id: 37, name: "Western" },
] as const;

export function getGenreName(type: MediaType, id: number) {
  const list = type === "movie" ? MOVIE_GENRES : TV_GENRES;
  return list.find((g) => g.id === id)?.name;
}
