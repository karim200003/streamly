import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { historyWriteLimiter, NO_STORE_HEADERS } from "@/lib/rate-limit";
import { requireUserApi, parseJsonBody } from "@/lib/api-guard";
import { historyUpsertSchema, historyDeleteSchema } from "@/lib/api-schemas";
import { idempotentDelete } from "@/lib/admin-guard";
import type { MediaType } from "@/lib/tmdb-shared";

const MAX_HISTORY = 30;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

/**
 * Movies collapse to season/episode 0 so the unique compound key has a
 * single row per title; TV keys on the actual episode.
 */
function episodeKey(
  mediaType: MediaType,
  season: number | null | undefined,
  episode: number | null | undefined,
) {
  return {
    season: mediaType === "tv" ? Number(season ?? 0) : 0,
    episode: mediaType === "tv" ? Number(episode ?? 0) : 0,
  };
}

export async function GET() {
  const gate = await requireUserApi();
  if (!gate.ok) return gate.res;

  const items = await prisma.watchHistory.findMany({
    where: { userId: gate.session.user.id },
    orderBy: { updatedAt: "desc" },
    take: MAX_HISTORY,
  });
  return json({ items });
}

export async function POST(req: Request) {
  const gate = await requireUserApi(historyWriteLimiter);
  if (!gate.ok) return gate.res;

  const parsed = await parseJsonBody(req, historyUpsertSchema);
  if (!parsed.ok) return parsed.res;
  const { tmdbId, mediaType, title, posterPath, season, episode } = parsed.data;
  const { progress, duration } = parsed.data;
  const key = episodeKey(mediaType, season, episode);

  // Progress arrives from a separate throttled beacon in Player.tsx. A
  // plain "I opened this page" POST carries none, so these fields must
  // only be written when actually reported — defaulting them to 0 here
  // would reset the saved position on every watch-page mount and make
  // the resume logic in watch/[type]/[id]/page.tsx permanently dead.
  const patch: { progress?: number; duration?: number } = {};
  if (duration !== undefined) patch.duration = duration;
  if (progress !== undefined) {
    // Never store a position past the end of the title.
    patch.progress =
      duration && duration > 0 ? Math.min(progress, duration) : progress;
  }

  await prisma.watchHistory.upsert({
    where: {
      userId_tmdbId_mediaType_season_episode: {
        userId: gate.session.user.id,
        tmdbId,
        mediaType,
        ...key,
      },
    },
    create: {
      userId: gate.session.user.id,
      tmdbId,
      mediaType,
      title,
      posterPath,
      ...key,
      progress: patch.progress ?? 0,
      duration: patch.duration ?? 0,
    },
    update: { title, posterPath, ...patch },
  });

  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const gate = await requireUserApi(historyWriteLimiter);
  if (!gate.ok) return gate.res;

  const parsed = await parseJsonBody(req, historyDeleteSchema);
  if (!parsed.ok) return parsed.res;
  const { tmdbId, mediaType, season, episode } = parsed.data;

  const failure = await idempotentDelete(
    () =>
      prisma.watchHistory.delete({
        where: {
          userId_tmdbId_mediaType_season_episode: {
            userId: gate.session.user.id,
            tmdbId,
            mediaType,
            ...episodeKey(mediaType, season, episode),
          },
        },
      }),
    `watchHistory.delete(${tmdbId})`,
  );
  if (failure) return failure;
  return json({ ok: true });
}
