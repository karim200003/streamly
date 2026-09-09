// Server Action counterpart to `api-guard.ts`.
//
// Actions can't return a `Response`, and throwing across the RSC
// boundary gives the client a redacted "An error occurred in the Server
// Components render" with no way to show the user what went wrong. So
// actions return a plain result object instead, and callers branch on it.

import type { z } from "zod";
import { auth } from "@/auth";

interface Limiter {
  limit: (
    key: string,
  ) => Promise<{ success: boolean; remaining: number; reset: number }>;
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export const ACTION_ERRORS = {
  unauthorized: "You need to be signed in to do that.",
  forbidden: "You don't have permission to do that.",
  rateLimited: "Too many requests — try again shortly.",
  badInput: "That request wasn't valid.",
  server: "Something went wrong. Please try again.",
} as const;

export function actionError(message: string): { ok: false; error: string } {
  return { ok: false, error: message };
}

type AuthedOk = { ok: true; userId: string; role?: "USER" | "ADMIN" };

/**
 * Resolve the caller, optionally spending a rate-limit token.
 *
 * `requireAdmin` gates the admin actions; every action re-checks on the
 * server rather than trusting that the UI only rendered the control for
 * an admin.
 */
export async function requireUserAction(
  limiter?: Limiter,
  opts: { requireAdmin?: boolean } = {},
): Promise<AuthedOk | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return actionError(ACTION_ERRORS.unauthorized);
  if (opts.requireAdmin && session.user.role !== "ADMIN") {
    return actionError(ACTION_ERRORS.forbidden);
  }
  if (limiter) {
    const rl = await limiter.limit(session.user.id);
    if (!rl.success) return actionError(ACTION_ERRORS.rateLimited);
  }
  return { ok: true, userId: session.user.id, role: session.user.role };
}

/** Validate an action's input, mapping failures to the shared shape. */
export function parseInput<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): { ok: true; data: z.infer<T> } | { ok: false; error: string } {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return actionError(ACTION_ERRORS.badInput);
  return { ok: true, data: parsed.data };
}
