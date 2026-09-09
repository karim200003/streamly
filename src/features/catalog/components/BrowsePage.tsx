import MediaGrid from "@/components/ui/MediaGrid";
import { discover } from "@/lib/tmdb";
import { parseSort, parseYear, parseRating } from "@/lib/discover-sort";
import MovieCard from "@/features/catalog/components/MovieCard";
import FiltersBar from "@/features/catalog/components/FiltersBar";
import GenreChips from "@/features/catalog/components/GenreChips";
import Pager from "@/features/catalog/components/Pager";
import MissingApiNotice from "@/features/catalog/components/MissingApiNotice";
import type { MediaType } from "@/lib/tmdb-shared";
import { mapMediaSummaries } from "@/features/catalog/domain";

/** TMDB refuses `page` above this. */
const MAX_PAGE = 500;

export interface BrowseSearchParams {
  sort?: string;
  year?: string;
  rating?: string;
  page?: string;
}

/**
 * The shared catalog browse screen behind /movies and /tv.
 *
 * The two pages were byte-identical apart from the media type and three
 * strings, so they now differ only in what they pass here.
 */
export default async function BrowsePage({
  mediaType,
  heading,
  searchParams,
}: {
  mediaType: MediaType;
  heading: string;
  searchParams: Promise<BrowseSearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Math.min(MAX_PAGE, Number(sp.page ?? "1") || 1));

  const result = await discover(mediaType, {
    sortBy: parseSort(mediaType, sp.sort),
    year: parseYear(sp.year),
    minRating: parseRating(sp.rating),
    page,
  });

  const items = mapMediaSummaries(result.results, mediaType);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8">
      <header className="mb-6">
        <h1 className="font-display italic text-4xl sm:text-5xl tracking-tight text-white">
          {heading}
        </h1>
        <p className="text-[var(--color-muted)] mt-1">
          Browse by genre, year, and rating.
        </p>
      </header>

      <MissingApiNotice />

      <div className="mb-4">
        <GenreChips mediaType={mediaType} />
      </div>

      <FiltersBar mediaType={mediaType} />

      {items.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          No titles match these filters.
        </p>
      ) : (
        <MediaGrid>
          {items.map((m, i) => (
            <MovieCard key={`${m.mediaType}-${m.id}`} media={m} priority={i < 6} />
          ))}
        </MediaGrid>
      )}

      <Pager page={result.page} totalPages={result.total_pages} />
    </div>
  );
}
