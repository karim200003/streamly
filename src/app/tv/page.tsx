import type { Metadata } from "next";
import { discover } from "@/lib/tmdb";
import MovieCard from "@/components/MovieCard";
import FiltersBar from "@/components/FiltersBar";
import GenreChips from "@/components/GenreChips";
import Pager from "@/components/Pager";
import MissingApiNotice from "@/components/MissingApiNotice";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "TV Shows",
  description: "Bingeable series — trending, popular, and top-rated.",
};

interface PageProps {
  searchParams: Promise<{
    sort?: string;
    year?: string;
    rating?: string;
    page?: string;
  }>;
}

export default async function TvPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = Math.max(1, Math.min(500, Number(sp.page ?? "1") || 1));

  const result = await discover("tv", {
    sortBy: sp.sort,
    year: sp.year ? Number(sp.year) : undefined,
    minRating: sp.rating ? Number(sp.rating) : undefined,
    page,
  });

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8">
      <header className="mb-6">
        <h1 className="font-display italic text-4xl sm:text-5xl tracking-tight text-white">
          TV Shows
        </h1>
        <p className="text-[var(--color-muted)] mt-1">
          Browse by genre, year, and rating.
        </p>
      </header>

      <MissingApiNotice />

      <div className="mb-4">
        <GenreChips mediaType="tv" />
      </div>

      <FiltersBar mediaType="tv" />

      {result.results.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          No titles match these filters.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {result.results.map((m) => (
            <MovieCard key={m.id} media={m} />
          ))}
        </div>
      )}

      <Pager page={result.page} totalPages={result.total_pages} />
    </div>
  );
}
