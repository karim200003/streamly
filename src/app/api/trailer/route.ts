import { NextResponse } from "next/server";
import { getDetails } from "@/lib/tmdb";
import { parseQuery } from "@/lib/api-guard";
import { mediaRefQuerySchema } from "@/lib/api-schemas";

// Cached lookup of a YouTube trailer key for a given title. The card
// hover preview hits this lazily so we don't fan out N detail calls
// just to render the home page.
// No `export const revalidate`: this handler reads searchParams from
// req.url, so it is dynamic and a route-level revalidate never applied.
// The caching comes from `getDetails` -> `tmdb()`, whose fetch carries
// `next: { revalidate }`.

export async function GET(req: Request) {
  const parsed = parseQuery(req, mediaRefQuerySchema);
  if (!parsed.ok) return parsed.res;
  const { tmdbId, mediaType } = parsed.data;

  try {
    const d = await getDetails(mediaType, tmdbId);
    const candidates = d.videos?.results ?? [];
    const trailer =
      candidates.find(
        (v) => v.site === "YouTube" && v.type === "Trailer" && v.official,
      ) ??
      candidates.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
      candidates.find((v) => v.site === "YouTube" && v.type === "Teaser");
    return NextResponse.json({ key: trailer?.key ?? null });
  } catch {
    return NextResponse.json({ key: null });
  }
}
