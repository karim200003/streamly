import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDetails } from "@/lib/tmdb";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const { tmdbId, mediaType } = body;
  if (
    typeof tmdbId !== "number" ||
    (mediaType !== "movie" && mediaType !== "tv")
  ) {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }

  // Pull current details from TMDB so we have backdrop/title/etc for
  // rendering the hero without an extra TMDB call later.
  let title = `${mediaType} ${tmdbId}`;
  let overview = "";
  let posterPath: string | null = null;
  let backdropPath: string | null = null;
  let voteAverage = 0;
  let releaseDate: string | null = null;
  try {
    const d = await getDetails(mediaType, tmdbId);
    title = d.title ?? d.name ?? title;
    overview = d.overview ?? "";
    posterPath = d.poster_path;
    backdropPath = d.backdrop_path;
    voteAverage = d.vote_average ?? 0;
    releaseDate = d.release_date ?? d.first_air_date ?? null;
  } catch {
    return NextResponse.json(
      { error: "Could not fetch from TMDB" },
      { status: 502 },
    );
  }

  const created = await prisma.featured.upsert({
    where: { tmdbId_mediaType: { tmdbId, mediaType } },
    create: {
      tmdbId,
      mediaType,
      title,
      overview,
      posterPath,
      backdropPath,
      voteAverage,
      releaseDate,
      active: true,
      createdById: session.user.id,
    },
    update: {
      title,
      overview,
      posterPath,
      backdropPath,
      voteAverage,
      releaseDate,
    },
  });
  return NextResponse.json({ id: created.id });
}
