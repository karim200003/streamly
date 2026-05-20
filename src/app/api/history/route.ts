import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  historyWriteLimiter,
  rateLimitResponse,
} from "@/lib/rate-limit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ items: [] });
  }
  const items = await prisma.watchHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: true });
  }
  const rl = await historyWriteLimiter.limit(session.user.id);
  if (!rl.success) return rateLimitResponse(rl.reset);

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const {
    tmdbId,
    mediaType,
    title,
    posterPath,
    season = null,
    episode = null,
    progress = 0,
    duration = 0,
  } = body;

  if (
    typeof tmdbId !== "number" ||
    (mediaType !== "movie" && mediaType !== "tv") ||
    typeof title !== "string"
  ) {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }

  const seasonKey = mediaType === "tv" ? Number(season ?? 0) : 0;
  const episodeKey = mediaType === "tv" ? Number(episode ?? 0) : 0;

  await prisma.watchHistory.upsert({
    where: {
      userId_tmdbId_mediaType_season_episode: {
        userId: session.user.id,
        tmdbId,
        mediaType,
        season: seasonKey,
        episode: episodeKey,
      },
    },
    create: {
      userId: session.user.id,
      tmdbId,
      mediaType,
      title,
      posterPath: posterPath ?? null,
      season: seasonKey,
      episode: episodeKey,
      progress: Number(progress) || 0,
      duration: Number(duration) || 0,
    },
    update: {
      title,
      posterPath: posterPath ?? null,
      progress: Number(progress) || 0,
      duration: Number(duration) || 0,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: true });
  }
  const rl = await historyWriteLimiter.limit(session.user.id);
  if (!rl.success) return rateLimitResponse(rl.reset);

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  const { tmdbId, mediaType, season = null, episode = null } = body;
  if (
    typeof tmdbId !== "number" ||
    (mediaType !== "movie" && mediaType !== "tv")
  ) {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }

  const seasonKey = mediaType === "tv" ? Number(season ?? 0) : 0;
  const episodeKey = mediaType === "tv" ? Number(episode ?? 0) : 0;

  try {
    await prisma.watchHistory.delete({
      where: {
        userId_tmdbId_mediaType_season_episode: {
          userId: session.user.id,
          tmdbId,
          mediaType,
          season: seasonKey,
          episode: episodeKey,
        },
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code !== "P2025") {
      console.error("[history] delete failed:", err);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
