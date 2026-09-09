import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Play, Star, Calendar, Clock } from "lucide-react";
import { getDetails, imageUrl, similarFromDetails, type MediaType } from "@/lib/tmdb";
import { formatRuntime } from "@/lib/utils";
import { getComments } from "@/features/comments/queries";
import {
  mapMediaDetails,
  mapMediaSummaries,
} from "@/features/catalog/domain";
import dynamic from "next/dynamic";
import Carousel from "@/features/catalog/components/Carousel";
import FavoriteButton from "@/features/favorites/components/FavoriteButton";
import SeasonPicker from "@/features/watch/components/SeasonPicker";
import TrailerButton from "@/features/watch/components/TrailerButton";

// Comments are below the fold (after hero, cast, seasons) and pull in
// useSession + a fetch on mount. Deferring their JS chunk shrinks the
// initial JS sent on every details page view.
const Comments = dynamic(() => import("@/features/comments/components/Comments"), {
  loading: () => (
    <div className="mt-12 space-y-3">
      <div className="h-7 w-48 rounded skeleton" />
      <div className="h-20 rounded-xl skeleton" />
      <div className="h-20 rounded-xl skeleton" />
    </div>
  ),
});

// NOTE: no `export const revalidate` here.
//
// This route renders dynamically, so a page-level revalidate would be
// inert — the build output lists it under "ƒ (Dynamic)" with a blank
// Revalidate column. It renders dynamically because `getServerLang()` reads the
// `lang` cookie inside every TMDB helper.
//
// Caching still happens where it matters: `tmdb()` issues its fetches
// with `next: { revalidate }`, so the upstream responses are shared
// across requests and TMDB is not re-hit per visitor. Removing the
// misleading export rather than leaving a no-op that reads like a
// guarantee.

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

  const mediaType: MediaType = type;
  // Comments come from our own database and TMDB details from upstream —
  // independent, so they run concurrently rather than in series.
  const [details, comments] = await Promise.all([
    getDetails(mediaType, tmdbId),
    getComments(tmdbId, mediaType),
  ]);
  // One mapper call replaces the title/backdrop/poster/runtime/year/
  // trailer derivations that were spelled out here — the same
  // expressions that also appeared in MovieCard, HeroBanner and the
  // search page.
  const media = mapMediaDetails(details, mediaType);
  const similar = mapMediaSummaries(
    similarFromDetails(details, mediaType),
    mediaType,
  );

  const {
    title,
    backdropUrl: backdrop,
    posterUrl: poster,
    runtime,
    year,
    trailerKey,
  } = media;

  return (
    <article>
      <section className="relative -mt-[var(--nav-h)] h-[46vh] min-h-[320px] sm:h-[62vh] sm:min-h-[460px]">
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
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/55 via-45% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/15 via-45% to-transparent" />
      </section>

      <div className="px-4 sm:px-6 lg:px-10 -mt-24 sm:-mt-32 relative z-10">
        <div className="mx-auto max-w-screen-2xl flex flex-col md:flex-row gap-8">
          {poster && (
            <div className="shrink-0 w-40 sm:w-52 md:w-64">
              <div className="relative aspect-[2/3] rounded-[var(--radius-tile)] overflow-hidden border border-white/[0.09] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.95)]">
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
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-[-0.03em] leading-[1.04]">
              {title}
            </h1>
            {media.tagline && (
              <p className="mt-2.5 text-[var(--color-muted)]">
                {media.tagline}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/80">
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-4 fill-current" />
                <span className="font-semibold tabular-nums">
                  {(media.rating ?? 0).toFixed(1)}
                  <span className="text-white/55 font-normal">/10</span>
                </span>
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
                {media.genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-2.5 py-0.5 rounded-full text-xs bg-white/10 border border-white/[0.08]"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-5 text-base text-white/85 max-w-3xl leading-relaxed">
              {media.overview}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href={media.watchHref} className="btn-primary px-7 py-3 text-base">
                <Play className="size-4 fill-black" />
                Play
              </Link>
              <FavoriteButton
                tmdbId={media.id}
                mediaType={mediaType}
                title={title}
                posterPath={details.poster_path}
              />
              {trailerKey && (
                <TrailerButton youtubeKey={trailerKey} label="Watch trailer" />
              )}
            </div>

            {media.cast.length > 0 && (
              <div className="mt-10">
                <h2 className="section-title mb-3">Top Cast</h2>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {media.cast.map((c) => {
                    const profile = c.profileUrl;
                    return (
                      <div key={c.id} className="shrink-0 w-28 text-center">
                        <div className="relative aspect-[2/3] rounded-[var(--radius-tile)] overflow-hidden bg-[var(--color-bg-2)] border border-white/[0.07]">
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

        {mediaType === "tv" && media.seasons.length > 0 && (
          <div className="mx-auto max-w-screen-2xl mt-12">
            <h2 className="section-title mb-4">Seasons &amp; Episodes</h2>
            {/* Season 0 (Specials) is already filtered out by the mapper. */}
            <SeasonPicker tvId={media.id} seasons={details.seasons ?? []} />
          </div>
        )}

        <div className="mx-auto max-w-screen-2xl">
          <Comments
            tmdbId={media.id}
            mediaType={mediaType}
            initialComments={comments}
          />
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
