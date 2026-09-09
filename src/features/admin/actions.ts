"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getDetails } from "@/lib/tmdb";
import { adminWriteLimiter } from "@/lib/rate-limit";
import {
  requireUserAction,
  parseInput,
  actionError,
  ACTION_ERRORS,
  type ActionResult,
} from "@/lib/action-guard";
import { mediaRefSchema } from "@/lib/api-schemas";
import { logger } from "@/lib/logger";

const log = logger("admin");

const ADMIN = { requireAdmin: true } as const;

/**
 * True when the target is an active admin and removing their privileges
 * would leave the deployment with none. Unrecoverable in a
 * credentials-only deployment, since ADMIN_EMAILS auto-promotion only
 * fires on an OAuth sign-in with a verified email (see src/auth.ts).
 */
async function wouldRemoveLastAdmin(targetId: string): Promise<boolean> {
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { role: true, banned: true },
  });
  if (!target || target.role !== "ADMIN" || target.banned) return false;
  const remaining = await prisma.user.count({
    where: { role: "ADMIN", banned: false, id: { not: targetId } },
  });
  return remaining === 0;
}

const userOpSchema = z.object({
  userId: z.string().min(1),
  op: z.enum(["promote", "demote", "ban", "unban", "delete"]),
});

export async function updateUser(
  input: unknown,
): Promise<ActionResult<undefined>> {
  const gate = await requireUserAction(adminWriteLimiter, ADMIN);
  if (!gate.ok) return gate;

  const parsed = parseInput(userOpSchema, input);
  if (!parsed.ok) return parsed;
  const { userId, op } = parsed.data;

  // Don't let an admin lock themselves out.
  if (userId === gate.userId && op !== "promote" && op !== "unban") {
    return actionError("Refusing to lock yourself out.");
  }
  if (
    (op === "demote" || op === "ban" || op === "delete") &&
    (await wouldRemoveLastAdmin(userId))
  ) {
    return actionError("Refusing to remove the last remaining admin.");
  }

  try {
    switch (op) {
      case "promote":
        await prisma.user.update({
          where: { id: userId },
          data: { role: "ADMIN" },
        });
        break;
      case "demote":
        await prisma.user.update({
          where: { id: userId },
          data: { role: "USER" },
        });
        break;
      case "ban":
        await prisma.user.update({
          where: { id: userId },
          data: { banned: true },
        });
        break;
      case "unban":
        await prisma.user.update({
          where: { id: userId },
          data: { banned: false },
        });
        break;
      case "delete":
        await prisma.user.delete({ where: { id: userId } });
        break;
    }
  } catch (err) {
    // P2025 = already gone; treat as success.
    if ((err as { code?: string }).code !== "P2025") {
      log.error(`user ${op} failed`, err);
      return actionError(ACTION_ERRORS.server);
    }
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true, data: undefined };
}

const commentModerationSchema = z.object({
  id: z.string().min(1),
  hidden: z.boolean(),
});

export async function setCommentHidden(
  input: unknown,
): Promise<ActionResult<undefined>> {
  const gate = await requireUserAction(adminWriteLimiter, ADMIN);
  if (!gate.ok) return gate;

  const parsed = parseInput(commentModerationSchema, input);
  if (!parsed.ok) return parsed;

  try {
    await prisma.comment.update({
      where: { id: parsed.data.id },
      data: { hidden: parsed.data.hidden },
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") {
      return actionError("That comment no longer exists.");
    }
    log.error("comment moderation failed", err);
    return actionError(ACTION_ERRORS.server);
  }

  revalidatePath("/admin/comments");
  return { ok: true, data: undefined };
}

export async function deleteCommentAsAdmin(
  id: string,
): Promise<ActionResult<undefined>> {
  const gate = await requireUserAction(adminWriteLimiter, ADMIN);
  if (!gate.ok) return gate;
  if (typeof id !== "string" || !id) return actionError(ACTION_ERRORS.badInput);

  try {
    await prisma.comment.delete({ where: { id } });
  } catch (err) {
    if ((err as { code?: string }).code !== "P2025") {
      log.error("comment delete failed", err);
      return actionError(ACTION_ERRORS.server);
    }
  }

  revalidatePath("/admin/comments");
  return { ok: true, data: undefined };
}

const featuredPatchSchema = z
  .object({
    id: z.string().min(1),
    active: z.boolean().optional(),
    // Integer: the column is an Int, so a float previously reached
    // Prisma and surfaced as a 500 rather than a validation error.
    position: z.number().int().min(0).optional(),
  })
  .refine((v) => v.active !== undefined || v.position !== undefined, {
    error: "Nothing to update",
  });

export async function updateFeatured(
  input: unknown,
): Promise<ActionResult<undefined>> {
  const gate = await requireUserAction(adminWriteLimiter, ADMIN);
  if (!gate.ok) return gate;

  const parsed = parseInput(featuredPatchSchema, input);
  if (!parsed.ok) return parsed;
  const { id, ...patch } = parsed.data;

  try {
    await prisma.featured.update({ where: { id }, data: patch });
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") {
      return actionError("That featured item no longer exists.");
    }
    log.error("featured update failed", err);
    return actionError(ACTION_ERRORS.server);
  }

  revalidatePath("/admin/featured");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function removeFeatured(
  id: string,
): Promise<ActionResult<undefined>> {
  const gate = await requireUserAction(adminWriteLimiter, ADMIN);
  if (!gate.ok) return gate;
  if (typeof id !== "string" || !id) return actionError(ACTION_ERRORS.badInput);

  try {
    await prisma.featured.delete({ where: { id } });
  } catch (err) {
    if ((err as { code?: string }).code !== "P2025") {
      log.error("featured delete failed", err);
      return actionError(ACTION_ERRORS.server);
    }
  }

  revalidatePath("/admin/featured");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function addFeatured(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireUserAction(adminWriteLimiter, ADMIN);
  if (!gate.ok) return gate;

  const parsed = parseInput(mediaRefSchema, input);
  if (!parsed.ok) return parsed;
  const { tmdbId, mediaType } = parsed.data;

  // Denormalise the TMDB metadata so rendering the hero later needs no
  // upstream call.
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
  } catch (err) {
    log.error("featured TMDB lookup failed", err);
    return actionError("Could not fetch that title from TMDB.");
  }

  try {
    const row = await prisma.featured.upsert({
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
        createdById: gate.userId,
      },
      update: {
        title,
        overview,
        posterPath,
        backdropPath,
        voteAverage,
        releaseDate,
        active: true,
      },
    });
    revalidatePath("/admin/featured");
    revalidatePath("/");
    return { ok: true, data: { id: row.id } };
  } catch (err) {
    log.error("featured upsert failed", err);
    return actionError(ACTION_ERRORS.server);
  }
}
