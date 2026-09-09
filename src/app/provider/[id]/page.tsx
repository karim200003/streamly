import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import MediaGrid from "@/components/ui/MediaGrid";
import MovieCard from "@/features/catalog/components/MovieCard";
import Pager from "@/features/catalog/components/Pager";
import MissingApiNotice from "@/features/catalog/components/MissingApiNotice";
import { discover, getProviderLogos } from "@/lib/tmdb";
import { findProvider, WATCH_REGION } from "@/lib/providers";
import { mapMediaSummaries } from "@/features/catalog/domain";

/** TMDB refuses `page` above this. */
const MAX_PAGE = 500;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const provider = findProvider(Number((await params).id));
  if (!provider) return {};
  return {
    title: `${provider.name} movies`,
    description: `Browse movies streaming on ${provider.name}.`,
  };
}

export default async function ProviderPage({
  params,
  searchParams,
}: PageProps) {
  const providerId = Number((await params).id);
  // Only the curated ids resolve — an arbitrary number would otherwise
  // render an empty, indexable page for every provider TMDB knows.
  const provider = findProvider(providerId);
  if (!provider) notFound();

  const sp = await searchParams;
  const page = Math.max(1, Math.min(MAX_PAGE, Number(sp.page ?? "1") || 1));

  const [result, logos] = await Promise.all([
    discover("movie", { providerId, page }),
    getProviderLogos(),
  ]);

  const logoUrl = logos.find((p) => p.id === providerId)?.logoUrl ?? null;
  const items = mapMediaSummaries(result.results, "movie");

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8">
      <header className="mb-7 flex items-center gap-4">
        {logoUrl && (
          <div className="relative size-14 sm:size-16 shrink-0 overflow-hidden rounded-[var(--radius-provider)] border border-white/[0.08]">
            <Image src={logoUrl} alt="" fill sizes="64px" className="object-cover" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="page-title">{provider.name}</h1>
          <p className="text-[var(--color-muted)] mt-1 text-sm">
            Movies streaming on {provider.name} in the {WATCH_REGION}.
          </p>
        </div>
      </header>

      <MissingApiNotice />

      {items.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          Nothing is listed on {provider.name} right now.
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
