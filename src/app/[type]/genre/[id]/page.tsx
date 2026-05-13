import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  discover,
  getGenreName,
  type MediaType,
} from "@/lib/tmdb";
import MovieCard from "@/components/MovieCard";
import FiltersBar from "@/components/FiltersBar";
import Pager from "@/components/Pager";
import MissingApiNotice from "@/components/MissingApiNotice";

export const revalidate = 1800;

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

  const mediaType = type as MediaType;
  const genreName = getGenreName(mediaType, genreId);
  if (!genreName) notFound();

  const page = Math.max(1, Math.min(500, Number(sp.page ?? "1") || 1));
  const result = await discover(mediaType, {
    genreId,
    sortBy: sp.sort,
    year: sp.year ? Number(sp.year) : undefined,
    minRating: sp.rating ? Number(sp.rating) : undefined,
    page,
  });

  const label = mediaType === "movie" ? "Movies" : "TV Shows";

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8">
      <header className="mb-6">
        <p className="text-sm text-[var(--color-accent)] uppercase tracking-wide font-medium">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {result.results.map((m) => (
            <MovieCard key={`${m.id}-${m.media_type}`} media={m} />
          ))}
        </div>
      )}

      <Pager page={result.page} totalPages={result.total_pages} />
    </div>
  );
}
