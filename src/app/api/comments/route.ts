import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  commentsPostLimiter,
  rateLimitResponse,
} from "@/lib/rate-limit";

const MAX_BODY_LEN = 2000;

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
  const comments = await prisma.comment.findMany({
    where: { tmdbId, mediaType, hidden: false },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });
  // Don't leak full email — just the local part as a fallback display.
  const safe = comments.map((c) => ({
    id: c.id,
    tmdbId: c.tmdbId,
    mediaType: c.mediaType,
    body: c.body,
    rating: c.rating,
    createdAt: c.createdAt,
    user: {
      id: c.user.id,
      name:
        c.user.name ??
        (c.user.email ? c.user.email.split("@")[0] : "Anonymous"),
      image: c.user.image,
    },
  }));
  return NextResponse.json({ comments: safe });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = await commentsPostLimiter.limit(session.user.id);
  if (!rl.success) return rateLimitResponse(rl.reset);

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const { tmdbId, mediaType, body: commentBody, rating } = body;
  if (
    typeof tmdbId !== "number" ||
    (mediaType !== "movie" && mediaType !== "tv") ||
    typeof commentBody !== "string"
  ) {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }
  const text = commentBody.trim();
  if (text.length === 0) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  }
  if (text.length > MAX_BODY_LEN) {
    return NextResponse.json(
      { error: `Comment too long (max ${MAX_BODY_LEN} chars)` },
      { status: 400 },
    );
  }
  let cleanRating: number | null = null;
  if (rating !== null && rating !== undefined) {
    const n = Number(rating);
    if (!Number.isFinite(n) || n < 1 || n > 10) {
      return NextResponse.json({ error: "Rating must be 1–10" }, { status: 400 });
    }
    cleanRating = Math.round(n);
  }

  const created = await prisma.comment.create({
    data: {
      userId: session.user.id,
      tmdbId,
      mediaType,
      body: text,
      rating: cleanRating,
    },
  });
  return NextResponse.json({ id: created.id });
}
