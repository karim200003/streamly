import type { Metadata } from "next";
import MediaGrid from "@/components/ui/MediaGrid";
import { notFound } from "next/navigation";
import {
  discover,
  getGenreName,
  type MediaType,
} from "@/lib/tmdb";
import { mapMediaSummaries } from "@/features/catalog/domain";
import { parseSort, parseYear, parseRating } from "@/lib/discover-sort";
import MovieCard from "@/features/catalog/components/MovieCard";
import FiltersBar from "@/features/catalog/components/FiltersBar";
import Pager from "@/features/catalog/components/Pager";
import MissingApiNotice from "@/features/catalog/components/MissingApiNotice";

// NOTE: no `export const revalidate` here.
//
// This route renders dynamically, so a page-level revalidate would be
// inert — the build output lists it under "ƒ (Dynamic)" with a blank
// Revalidate column. Two things force that: the `?sort=/year=/rating=`
// searchParams read below, and `getServerLang()` reading the `lang`
// cookie inside every TMDB helper.
//
// Caching still happens where it matters: `tmdb()` issues its fetches
// with `next: { revalidate }`, so the upstream responses are shared
// across requests and TMDB is not re-hit per visitor. Removing the
// misleading export rather than leaving a no-op that reads like a
// guarantee.

interface PageProps {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{
    sort?: string;
    year?: string;
    rating?: string;
    page?: string;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { type, id } = await params;
  if (type !== "movie" && type !== "tv") return {};
  const genreName = getGenreName(type as MediaType, Number(id));
  if (!genreName) return {};
  const label = type === "movie" ? "Movies" : "TV Shows";
  return {
    title: `${genreName} ${label}`,
    description: `Browse ${genreName.toLowerCase()} ${label.toLowerCase()} on Streamly.`,
  };
}

export default async function GenrePage({ params, searchParams }: PageProps) {
  const { type, id } = await params;
  const sp = await searchParams;

  if (type !== "movie" && type !== "tv") notFound();
  const genreId = Number(id);
  if (!Number.isFinite(genreId)) notFound();

  const mediaType: MediaType = type;
  const genreName = getGenreName(mediaType, genreId);
  if (!genreName) notFound();

  const page = Math.max(1, Math.min(500, Number(sp.page ?? "1") || 1));
  const result = await discover(mediaType, {
    genreId,
    sortBy: parseSort(mediaType, sp.sort),
    year: parseYear(sp.year),
    minRating: parseRating(sp.rating),
    page,
  });

  const label = mediaType === "movie" ? "Movies" : "TV Shows";

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8">
      <header className="mb-6">
        <p className="text-sm text-[var(--color-muted)] uppercase tracking-wide font-medium">
          {label}
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-1">
          {genreName}
        </h1>
        <p className="text-[var(--color-muted)] mt-1">
          {result.total_results.toLocaleString()} titles
        </p>
      </header>

      <MissingApiNotice />
      <FiltersBar mediaType={mediaType} />

      {result.results.length === 0 ? (
        <p className="text-[var(--color-muted)] mt-10">
          No titles match these filters.
        </p>
      ) : (
        <MediaGrid>
          {mapMediaSummaries(result.results, mediaType).map((m, i) => (
            <MovieCard
              key={`${m.mediaType}-${m.id}`}
              media={m}
              priority={i < 6}
            />
          ))}
        </MediaGrid>
      )}

      <Pager page={result.page} totalPages={result.total_pages} />
    </div>
  );
}
