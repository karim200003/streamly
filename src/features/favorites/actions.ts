"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { favoritesWriteLimiter } from "@/lib/rate-limit";
import {
  requireUserAction,
  parseInput,
  actionError,
  ACTION_ERRORS,
  type ActionResult,
} from "@/lib/action-guard";
import { favoriteCreateSchema, mediaRefSchema } from "@/lib/api-schemas";
import type { MediaType } from "@/lib/tmdb-shared";
import { logger } from "@/lib/logger";

const log = logger("favorites");

/**
 * Toggling a favourite has to invalidate the /favorites route, which the
 * old client-fetch path never did — the button updated its own local
 * state while the list page kept serving whatever it last rendered.
 */
function revalidateFavorites() {
  revalidatePath("/favorites");
}

export async function isFavorite(
  tmdbId: number,
  mediaType: MediaType,
): Promise<boolean> {
  const gate = await requireUserAction();
  if (!gate.ok) return false;

  const fav = await prisma.favorite.findUnique({
    where: {
      userId_tmdbId_mediaType: { userId: gate.userId, tmdbId, mediaType },
    },
    select: { id: true },
  });
  return !!fav;
}

export async function addFavorite(
  input: unknown,
): Promise<ActionResult<undefined>> {
  const gate = await requireUserAction(favoritesWriteLimiter);
  if (!gate.ok) return gate;

  const parsed = parseInput(favoriteCreateSchema, input);
  if (!parsed.ok) return parsed;
  const { tmdbId, mediaType, title, posterPath } = parsed.data;

  try {
    await prisma.favorite.upsert({
      where: {
        userId_tmdbId_mediaType: { userId: gate.userId, tmdbId, mediaType },
      },
      create: { userId: gate.userId, tmdbId, mediaType, title, posterPath },
      update: { title, posterPath },
    });
  } catch (err) {
    log.error("add failed", err);
    return actionError(ACTION_ERRORS.server);
  }

  revalidateFavorites();
  return { ok: true, data: undefined };
}

export async function removeFavorite(
  input: unknown,
): Promise<ActionResult<undefined>> {
  const gate = await requireUserAction(favoritesWriteLimiter);
  if (!gate.ok) return gate;

  const parsed = parseInput(mediaRefSchema, input);
  if (!parsed.ok) return parsed;
  const { tmdbId, mediaType } = parsed.data;

  try {
    await prisma.favorite.delete({
      where: {
        userId_tmdbId_mediaType: { userId: gate.userId, tmdbId, mediaType },
      },
    });
  } catch (err) {
    // P2025 = already gone. Deleting twice is success, not an error.
    if ((err as { code?: string }).code !== "P2025") {
      log.error("remove failed", err);
      return actionError(ACTION_ERRORS.server);
    }
  }

  revalidateFavorites();
  return { ok: true, data: undefined };
}
