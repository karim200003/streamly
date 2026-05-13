import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  favoritesWriteLimiter,
  rateLimitResponse,
} from "@/lib/rate-limit";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const tmdbId = Number(searchParams.get("tmdbId"));
  const mediaType = searchParams.get("mediaType") ?? "";

  if (Number.isFinite(tmdbId) && (mediaType === "movie" || mediaType === "tv")) {
    const fav = await prisma.favorite.findUnique({
      where: {
        userId_tmdbId_mediaType: {
          userId: session.user.id,
          tmdbId,
          mediaType,
        },
      },
    });
    return NextResponse.json({ exists: !!fav });
  }

  const all = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ favorites: all });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = await favoritesWriteLimiter.limit(session.user.id);
  if (!rl.success) return rateLimitResponse(rl.reset);

  const body = await req.json();
  const { tmdbId, mediaType, title, posterPath } = body ?? {};
  if (
    typeof tmdbId !== "number" ||
    (mediaType !== "movie" && mediaType !== "tv") ||
    typeof title !== "string"
  ) {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }
  await prisma.favorite.upsert({
    where: {
      userId_tmdbId_mediaType: {
        userId: session.user.id,
        tmdbId,
        mediaType,
      },
    },
    create: {
      userId: session.user.id,
      tmdbId,
      mediaType,
      title,
      posterPath: posterPath ?? null,
    },
    update: { title, posterPath: posterPath ?? null },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = await favoritesWriteLimiter.limit(session.user.id);
  if (!rl.success) return rateLimitResponse(rl.reset);

  const body = await req.json();
  const { tmdbId, mediaType } = body ?? {};
  if (
    typeof tmdbId !== "number" ||
    (mediaType !== "movie" && mediaType !== "tv")
  ) {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }
  await prisma.favorite
    .delete({
      where: {
        userId_tmdbId_mediaType: {
          userId: session.user.id,
          tmdbId,
          mediaType,
        },
      },
    })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
