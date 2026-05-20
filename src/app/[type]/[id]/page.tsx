import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Play, Star, Calendar, Clock } from "lucide-react";
import { getDetails, imageUrl, similarFromDetails, type MediaType } from "@/lib/tmdb";
import { formatRuntime } from "@/lib/utils";
import dynamic from "next/dynamic";
import Carousel from "@/components/Carousel";
import FavoriteButton from "@/components/FavoriteButton";
import SeasonPicker from "@/components/SeasonPicker";
import TrailerButton from "@/components/TrailerButton";

// Comments are below the fold (after hero, cast, seasons) and pull in
// useSession + a fetch on mount. Deferring their JS chunk shrinks the
// initial JS sent on every details page view.
const Comments = dynamic(() => import("@/components/Comments"), {
  loading: () => (
    <div className="mt-12 space-y-3">
      <div className="h-7 w-48 rounded skeleton" />
      <div className="h-20 rounded-xl skeleton" />
      <div className="h-20 rounded-xl skeleton" />
    </div>
  ),
});

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}): Promise<Metadata> {
  const { type, id } = await params;
  if (type !== "movie" && type !== "tv") return {};
  const tmdbId = Number(id);
  if (!Number.isFinite(tmdbId)) return {};

  try {
    const d = await getDetails(type as MediaType, tmdbId);
    const title = d.title ?? d.name ?? "Untitled";
    const year = (d.release_date ?? d.first_air_date ?? "").slice(0, 4);
    const description =
      d.overview?.slice(0, 200) ?? `Watch ${title} on Streamly.`;
    const og = imageUrl(d.backdrop_path, "w1280") ?? imageUrl(d.poster_path, "w780");
    const fullTitle = year ? `${title} (${year})` : title;

    return {
      title: fullTitle,
      description,
      openGraph: {
        title: fullTitle,
        description,
        type: type === "movie" ? "video.movie" : "video.tv_show",
        images: og ? [{ url: og, width: 1280, height: 720, alt: title }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: fullTitle,
        description,
        images: og ? [og] : undefined,
      },
    };
  } catch {
    return {};
  }
}

export default async function DetailsPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  if (type !== "movie" && type !== "tv") notFound();
  const tmdbId = Number(id);
  if (!Number.isFinite(tmdbId)) notFound();

  const mediaType = type as MediaType;
  const details = await getDetails(mediaType, tmdbId);
  const similar = similarFromDetails(details, mediaType);

  const title = details.title ?? details.name ?? "Untitled";
  const backdrop = imageUrl(details.backdrop_path, "w1280");
  const poster = imageUrl(details.poster_path, "w500");
  const runtime =
    details.runtime ??
    (details.episode_run_time && details.episode_run_time[0]) ??
    null;
  const year = (details.release_date ?? details.first_air_date ?? "").slice(0, 4);
  const trailer = details.videos?.results.find(
    (v) => v.site === "YouTube" && v.type === "Trailer",
  );

  return (
    <article>
      <section className="relative -mt-16 h-[60vh] min-h-[440px]">
        {backdrop && (
          <Image
            src={backdrop}
            alt={title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/60 to-transparent" />
      </section>

      <div className="px-4 sm:px-6 lg:px-10 -mt-32 relative z-10">
        <div className="mx-auto max-w-screen-2xl flex flex-col md:flex-row gap-8">
          {poster && (
            <div className="shrink-0 w-40 sm:w-52 md:w-64">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
                <Image
                  src={poster}
                  alt={title}
                  fill
                  sizes="256px"
                  className="object-cover"
                />
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              {title}
            </h1>
            {details.tagline && (
              <p className="mt-2 italic text-[var(--color-muted)]">
                {details.tagline}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/80">
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-4 text-yellow-400 fill-yellow-400" />
                {details.vote_average.toFixed(1)}
              </span>
              {year && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-4" />
                  {year}
                </span>
              )}
              {runtime && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" />
                  {formatRuntime(runtime)}
                </span>
              )}
              <div className="flex flex-wrap gap-1.5">
                {details.genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-2 py-0.5 rounded-full text-xs bg-white/10"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-5 text-base text-white/85 max-w-3xl leading-relaxed">
              {details.overview}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={`/watch/${mediaType}/${details.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition"
              >
                <Play className="size-4 fill-black" />
                Watch now
              </Link>
              <FavoriteButton
                tmdbId={details.id}
                mediaType={mediaType}
                title={title}
                posterPath={details.poster_path}
              />
              {trailer && (
                <TrailerButton
                  youtubeKey={trailer.key}
                  label="Watch trailer"
                />
              )}
            </div>

            {details.credits?.cast && details.credits.cast.length > 0 && (
              <div className="mt-10">
                <h2 className="text-lg font-semibold mb-3">Top Cast</h2>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {details.credits.cast.slice(0, 12).map((c) => {
                    const profile = imageUrl(c.profile_path, "w200");
                    return (
                      <div key={c.id} className="shrink-0 w-28 text-center">
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-white/5">
                          {profile ? (
                            <Image
                              src={profile}
                              alt={c.name}
                              fill
                              sizes="112px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 grid place-items-center text-2xl text-white/40">
                              {c.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="mt-1.5 text-xs font-medium line-clamp-1">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-[var(--color-muted)] line-clamp-1">
                          {c.character}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {mediaType === "tv" && details.seasons && details.seasons.length > 0 && (
          <div className="mx-auto max-w-screen-2xl mt-12">
            <h2 className="text-xl font-semibold mb-4">Seasons & Episodes</h2>
            <SeasonPicker
              tvId={details.id}
              seasons={details.seasons.filter((s) => s.season_number > 0)}
            />
          </div>
        )}

        <div className="mx-auto max-w-screen-2xl">
          <Comments tmdbId={details.id} mediaType={mediaType} />
        </div>
      </div>

      {similar.length > 0 && (
        <div className="mt-12">
          <Carousel title="More like this" items={similar} />
        </div>
      )}
    </article>
  );
}
