import { NextResponse } from "next/server";
import { getDetails } from "@/lib/tmdb";

// Cached lookup of a YouTube trailer key for a given title. The card
// hover preview hits this lazily so we don't fan out N detail calls
// just to render the home page.
export const revalidate = 86400;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tmdbId = Number(searchParams.get("tmdbId"));
  const mediaType = searchParams.get("mediaType");
  if (
    !Number.isFinite(tmdbId) ||
    (mediaType !== "movie" && mediaType !== "tv")
  ) {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }
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
