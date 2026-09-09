import type { Metadata } from "next";
import BrowsePage, { type BrowseSearchParams } from "@/features/catalog/components/BrowsePage";

// NOTE: no `export const revalidate` here — this route renders
// dynamically (searchParams + the `lang` cookie read inside every TMDB
// helper), so a page-level revalidate is inert. Caching happens at the
// fetch layer in `tmdb()`. See BrowsePage for the shared implementation.

export const metadata: Metadata = {
  title: "TV Shows",
  description: "Bingeable series — trending, popular, and top-rated.",
};

export default async function TvPage({
  searchParams,
}: {
  searchParams: Promise<BrowseSearchParams>;
}) {
  return (
    <BrowsePage mediaType="tv" heading="TV Shows" searchParams={searchParams} />
  );
}
