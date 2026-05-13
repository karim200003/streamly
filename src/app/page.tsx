import {
  getTrending,
  getPopularMovies,
  getPopularTv,
  getTopRatedMovies,
  type TmdbMedia,
} from "@/lib/tmdb";
import { prisma } from "@/lib/prisma";
import HeroBanner from "@/components/HeroBanner";
import Carousel from "@/components/Carousel";
import MissingApiNotice from "@/components/MissingApiNotice";
import ContinueWatching from "@/components/ContinueWatching";
import ContinueWatchingSkeleton from "@/components/ContinueWatchingSkeleton";
import { Suspense } from "react";

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
    media_type: featured.mediaType as "movie" | "tv",
  };
}

export default async function HomePage() {
  const [adminHero, popularMovies, popularTv, topRated, trending] =
    await Promise.all([
      pickAdminHero(),
      getPopularMovies(),
      getPopularTv(),
      getTopRatedMovies(),
      getTrending("week"),
    ]);

  const heroItems: TmdbMedia[] = [
    ...(adminHero ? [adminHero] : []),
    ...trending
      .filter((m) => m.backdrop_path && (!adminHero || m.id !== adminHero.id))
      .slice(0, adminHero ? 5 : 6),
  ];

  return (
    <>
      {heroItems.length > 0 && <HeroBanner items={heroItems} />}
      <MissingApiNotice />
      <Suspense fallback={<ContinueWatchingSkeleton />}>
        <ContinueWatching />
      </Suspense>
      <Carousel title="Trending This Week" items={trending} priority fancy />
      <Carousel title="Popular Movies" items={popularMovies} />
      <Carousel title="Popular TV Shows" items={popularTv} />
      <Carousel title="Top Rated" items={topRated} />
    </>
  );
}
