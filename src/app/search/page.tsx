import type { Metadata } from "next";
import { Suspense } from "react";
import { TrendingUp } from "lucide-react";
import { searchPool, getTrendingSearches } from "@/lib/tmdb";
import MovieCard from "@/features/catalog/components/MovieCard";
import MediaGrid from "@/components/ui/MediaGrid";
import SearchControls from "@/features/search/SearchControls";
import { parseFilters, applyFilters } from "@/features/search/filters";
import { mapMediaSummaries } from "@/features/catalog/domain";

// NOTE: no `export const revalidate` — this route reads searchParams and
// is rendered dynamically. TMDB responses are cached at the fetch layer.

export const metadata: Metadata = {
  title: "Search",
  description: "Find movies and shows by title, genre, year, and rating.",
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    genre?: string;
    year?: string;
    rating?: string;
  }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const filters = parseFilters(await searchParams);
  const query = filters.q.trim();

  // Trending is only shown on the empty state, so don't pay for it while
  // a search is active.
  const [pool, trending] = await Promise.all([
    query ? searchPool(query) : Promise.resolve([]),
    query ? Promise.resolve([]) : getTrendingSearches(),
  ]);

  const results = mapMediaSummaries(applyFilters(pool, filters));
  const trendingItems = mapMediaSummaries(trending);
  const hidden = pool.length - results.length;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8">
      <div className="mx-auto max-w-screen-2xl">
        <h1 className="font-display italic text-4xl sm:text-5xl tracking-tight text-white">
          Search
        </h1>
        <p className="text-[var(--color-muted)] mt-1">
          Find movies and shows by title, then filter by genre, year, and rating.
        </p>

        {/* useSearchParams needs a Suspense boundary during prerender. */}
        <Suspense fallback={<div className="mt-6 h-[50px] max-w-xl rounded-xl skeleton" />}>
          <SearchControls filters={filters} />
        </Suspense>

        <div className="mt-8">
          {query ? (
            results.length === 0 ? (
              <p className="text-[var(--color-muted)]">
                {pool.length === 0
                  ? `No results for “${query}”.`
                  : `No results match those filters (${hidden} hidden).`}
              </p>
            ) : (
              <>
                <p className="text-sm text-[var(--color-muted)] mb-3">
                  {results.length}{" "}
                  {results.length === 1 ? "result" : "results"}
                  {hidden > 0 && <span> · {hidden} hidden by filters</span>}
                </p>
                <MediaGrid>
                  {results.map((m, i) => (
                    <MovieCard
                      key={`${m.mediaType}-${m.id}`}
                      media={m}
                      priority={i < 6}
                    />
                  ))}
                </MediaGrid>
              </>
            )
          ) : (
            trendingItems.length > 0 && (
              <div>
                <h2 className="inline-flex items-center gap-2 text-sm font-medium text-white/80 uppercase tracking-wide mb-4">
                  <TrendingUp className="size-4 text-[var(--color-accent)]" />
                  Trending today
                </h2>
                <MediaGrid>
                  {trendingItems.map((m, i) => (
                    <MovieCard
                      key={`${m.mediaType}-${m.id}`}
                      media={m}
                      priority={i < 6}
                    />
                  ))}
                </MediaGrid>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
