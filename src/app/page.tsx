import {
  getTrending,
  getPopularMovies,
  getPopularTv,
  getTopRatedMovies,
  type TmdbMedia,
} from "@/lib/tmdb";
import { prisma } from "@/lib/prisma";
import { mapMediaSummaries } from "@/features/catalog/domain";
import HeroBanner from "@/features/catalog/components/HeroBanner";
import Carousel from "@/features/catalog/components/Carousel";
import MissingApiNotice from "@/features/catalog/components/MissingApiNotice";
import ContinueWatching from "@/features/history/components/ContinueWatching";
import ContinueWatchingSkeleton from "@/features/history/components/ContinueWatchingSkeleton";
import { Suspense } from "react";
import { logger } from "@/lib/logger";

const log = logger("home");

async function pickAdminHero(): Promise<TmdbMedia | null> {
  const featured = await prisma.featured
    .findFirst({
      where: { active: true },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    })
    .catch(() => null);
  if (!featured) return null;
  return {
    id: featured.tmdbId,
    title: featured.mediaType === "movie" ? featured.title : undefined,
    name: featured.mediaType === "tv" ? featured.title : undefined,
    overview: featured.overview,
    poster_path: featured.posterPath,
    backdrop_path: featured.backdropPath,
    vote_average: featured.voteAverage,
    release_date:
      featured.mediaType === "movie" ? featured.releaseDate ?? "" : undefined,
    first_air_date:
      featured.mediaType === "tv" ? featured.releaseDate ?? "" : undefined,
    // `mediaType` is a MediaType enum column now, so no cast is needed.
    media_type: featured.mediaType,
  };
}

/**
 * Each rail is independent, so one upstream failure should cost that
 * rail and nothing else. `Promise.all` used to reject the whole render
 * and 500 the home page whenever a single TMDB call failed.
 */
async function rail(
  load: () => Promise<TmdbMedia[]>,
  name: string,
): Promise<TmdbMedia[]> {
  try {
    return await load();
  } catch (err) {
    log.error(`${name} rail failed`, err);
    return [];
  }
}

export default async function HomePage() {
  const [adminHero, popularMovies, popularTv, topRated, trending] =
    await Promise.all([
      pickAdminHero(),
      rail(getPopularMovies, "popular movies"),
      rail(getPopularTv, "popular tv"),
      rail(getTopRatedMovies, "top rated"),
      rail(() => getTrending("week"), "trending"),
    ]);

  // The hero needs a backdrop, so titles without one are skipped rather
  // than rendered as an empty banner.
  const heroItems = mapMediaSummaries([
    ...(adminHero ? [adminHero] : []),
    ...trending
      .filter((m) => m.backdrop_path && (!adminHero || m.id !== adminHero.id))
      .slice(0, adminHero ? 5 : 6),
  ]);

  return (
    <>
      {heroItems.length > 0 && <HeroBanner items={heroItems} />}
      <MissingApiNotice />
      <Suspense fallback={<ContinueWatchingSkeleton />}>
        <ContinueWatching />
      </Suspense>
      {/* Carousel already renders nothing for an empty list. */}
      <Carousel
        title="Trending This Week"
        items={mapMediaSummaries(trending)}
        priority
      />
      <Carousel
        title="Popular Movies"
        items={mapMediaSummaries(popularMovies, "movie")}
      />
      <Carousel
        title="Popular TV Shows"
        items={mapMediaSummaries(popularTv, "tv")}
      />
      <Carousel
        title="Top Rated"
        items={mapMediaSummaries(topRated, "movie")}
      />
    </>
  );
}
