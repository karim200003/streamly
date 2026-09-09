// Domain model for a title, and the mappers that produce it.
//
// Everything above this line in the stack speaks TMDB's wire format:
// snake_case, `title` OR `name` depending on media type, `poster_path`
// as a bare path, `media_type` sometimes absent. Every consumer used to
// re-derive those facts for itself — the title fallback, the year slice,
// the movie/tv guess — which is why the same three expressions appeared
// in MovieCard, HeroBanner, the search page, the details page and
// sitemap.ts.
//
// Below this line the app speaks `MediaSummary`: resolved, camelCase,
// with image URLs already built.

import {
  imageUrl,
  getTitle,
  getReleaseYear,
  getMediaType,
  type MediaType,
  type TmdbMedia,
  type TmdbDetails,
} from "@/lib/tmdb-shared";

export interface MediaSummary {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  /** Ready to hand to next/image; null when TMDB has no artwork. */
  posterUrl: string | null;
  backdropUrl: string | null;
  /** Four-digit year, or null when TMDB has no date. */
  year: string | null;
  /** 0-10. Null when TMDB reports no votes, rather than a misleading 0. */
  rating: number | null;
  genreIds: number[];
  /** Canonical route for this title. */
  href: string;
}

/**
 * TMDB omits `media_type` on the single-type endpoints (/movie/popular
 * and friends), so callers that know the type pass it as a fallback.
 */
export function mapMediaSummary(
  raw: TmdbMedia,
  fallbackType?: MediaType,
): MediaSummary {
  const mediaType = raw.media_type ?? fallbackType ?? getMediaType(raw);
  const rating =
    typeof raw.vote_average === "number" && Number.isFinite(raw.vote_average)
      ? raw.vote_average
      : null;

  return {
    id: raw.id,
    mediaType,
    title: getTitle(raw),
    overview: raw.overview ?? "",
    posterUrl: imageUrl(raw.poster_path, "w500"),
    backdropUrl: imageUrl(raw.backdrop_path, "w1280"),
    year: getReleaseYear(raw) || null,
    rating,
    genreIds: raw.genre_ids ?? [],
    href: `/${mediaType}/${raw.id}`,
  };
}

export function mapMediaSummaries(
  raws: TmdbMedia[],
  fallbackType?: MediaType,
): MediaSummary[] {
  return raws.map((r) => mapMediaSummary(r, fallbackType));
}

export interface MediaDetails extends MediaSummary {
  tagline: string | null;
  /** Minutes. Movies use `runtime`; TV uses the first `episode_run_time`. */
  runtime: number | null;
  genres: { id: number; name: string }[];
  /** YouTube key of the best available trailer, if any. */
  trailerKey: string | null;
  cast: { id: number; name: string; character: string; profileUrl: string | null }[];
  seasons: {
    id: number;
    name: string;
    seasonNumber: number;
    episodeCount: number;
  }[];
  watchHref: string;
}

export function mapMediaDetails(
  raw: TmdbDetails,
  mediaType: MediaType,
): MediaDetails {
  const summary = mapMediaSummary(raw, mediaType);

  // Prefer an official trailer, then any trailer, then a teaser — the
  // same precedence the trailer endpoint uses.
  const videos = raw.videos?.results ?? [];
  const trailer =
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ??
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
    videos.find((v) => v.site === "YouTube" && v.type === "Teaser");

  return {
    ...summary,
    tagline: raw.tagline?.trim() || null,
    runtime: raw.runtime ?? raw.episode_run_time?.[0] ?? null,
    genres: raw.genres ?? [],
    trailerKey: trailer?.key ?? null,
    cast: (raw.credits?.cast ?? []).slice(0, 12).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profileUrl: imageUrl(c.profile_path, "w200"),
    })),
    // Season 0 is TMDB's "Specials" bucket; the picker never showed it.
    seasons: (raw.seasons ?? [])
      .filter((s) => s.season_number > 0)
      .map((s) => ({
        id: s.id,
        name: s.name,
        seasonNumber: s.season_number,
        episodeCount: s.episode_count,
      })),
    watchHref: `/watch/${mediaType}/${raw.id}`,
  };
}
