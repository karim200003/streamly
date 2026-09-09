"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { commentsPostLimiter, commentsDeleteLimiter } from "@/lib/rate-limit";
import {
  requireUserAction,
  parseInput,
  actionError,
  ACTION_ERRORS,
  type ActionResult,
} from "@/lib/action-guard";
import { commentCreateSchema } from "@/lib/api-schemas";
import { logger } from "@/lib/logger";

const log = logger("comments");

export async function postComment(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireUserAction(commentsPostLimiter);
  if (!gate.ok) return gate;

  const parsed = parseInput(commentCreateSchema, input);
  if (!parsed.ok) return parsed;
  const { tmdbId, mediaType, body, rating } = parsed.data;

  try {
    const created = await prisma.comment.create({
      data: {
        userId: gate.userId,
        tmdbId,
        mediaType,
        body,
        rating: rating ?? null,
      },
    });
    revalidatePath(`/${mediaType}/${tmdbId}`);
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    log.error("post failed", err);
    return actionError(ACTION_ERRORS.server);
  }
}

export async function deleteComment(
  id: string,
): Promise<ActionResult<undefined>> {
  const gate = await requireUserAction(commentsDeleteLimiter);
  if (!gate.ok) return gate;

  if (typeof id !== "string" || !id) return actionError(ACTION_ERRORS.badInput);

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { userId: true, tmdbId: true, mediaType: true },
  });
  // Already gone: idempotent, and avoids an existence oracle for other
  // users' comment ids.
  if (!comment) return { ok: true, data: undefined };

  const isOwner = comment.userId === gate.userId;
  const isAdmin = gate.role === "ADMIN";
  if (!isOwner && !isAdmin) return actionError(ACTION_ERRORS.forbidden);

  try {
    if (isAdmin && !isOwner) {
      // Admins soft-hide rather than delete, preserving the audit trail.
      await prisma.comment.update({ where: { id }, data: { hidden: true } });
    } else {
      await prisma.comment.delete({ where: { id } });
    }
  } catch (err) {
    log.error("delete failed", err);
    return actionError(ACTION_ERRORS.server);
  }

  revalidatePath(`/${comment.mediaType}/${comment.tmdbId}`);
  return { ok: true, data: undefined };
}
