"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { historyWriteLimiter } from "@/lib/rate-limit";
import {
  requireUserAction,
  parseInput,
  actionError,
  ACTION_ERRORS,
  type ActionResult,
} from "@/lib/action-guard";
import { historyUpsertSchema, historyDeleteSchema } from "@/lib/api-schemas";
import type { MediaType } from "@/lib/tmdb-shared";
import { logger } from "@/lib/logger";

const log = logger("history");

/**
 * Movies collapse to season/episode 0 so the unique compound key holds a
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

export async function removeFromHistory(
  input: unknown,
): Promise<ActionResult<undefined>> {
  const gate = await requireUserAction(historyWriteLimiter);
  if (!gate.ok) return gate;

  const parsed = parseInput(historyDeleteSchema, input);
  if (!parsed.ok) return parsed;
  const { tmdbId, mediaType, season, episode } = parsed.data;

  try {
    await prisma.watchHistory.delete({
      where: {
        userId_tmdbId_mediaType_season_episode: {
          userId: gate.userId,
          tmdbId,
          mediaType,
          ...episodeKey(mediaType, season, episode),
        },
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code !== "P2025") {
      log.error("remove failed", err);
      return actionError(ACTION_ERRORS.server);
    }
  }

  // Both surfaces that render history.
  revalidatePath("/history");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

/**
 * Record or update a watch entry.
 *
 * NOTE: `progress`/`duration` are only written when actually reported.
 * Defaulting them to 0 would reset the saved position on every
 * watch-page mount and make resume permanently dead — see the schema.
 */
export async function recordWatch(
  input: unknown,
): Promise<ActionResult<undefined>> {
  const gate = await requireUserAction(historyWriteLimiter);
  if (!gate.ok) return gate;

  const parsed = parseInput(historyUpsertSchema, input);
  if (!parsed.ok) return parsed;
  const { tmdbId, mediaType, title, posterPath, season, episode } = parsed.data;
  const { progress, duration } = parsed.data;
  const key = episodeKey(mediaType, season, episode);

  const patch: { progress?: number; duration?: number } = {};
  if (duration !== undefined) patch.duration = duration;
  if (progress !== undefined) {
    patch.progress =
      duration && duration > 0 ? Math.min(progress, duration) : progress;
  }

  try {
    await prisma.watchHistory.upsert({
      where: {
        userId_tmdbId_mediaType_season_episode: {
          userId: gate.userId,
          tmdbId,
          mediaType,
          ...key,
        },
      },
      create: {
        userId: gate.userId,
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
  } catch (err) {
    log.error("record failed", err);
    return actionError(ACTION_ERRORS.server);
  }
  return { ok: true, data: undefined };
}
