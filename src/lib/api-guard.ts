// User-facing counterpart to `admin-guard.ts`.
//
// Seven handlers repeated the same prologue — resolve the session, 401
// if absent, take a rate-limit token, 429 if exhausted — and the copies
// had already drifted apart (history answered 200 `{ok:true}` where
// favorites answered 401 for the identical condition). This centralises
// it behind the same discriminated-union shape `requireAdminApi` uses,
// so nothing throws across the request boundary.

import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import type { z } from "zod";
import { auth } from "@/auth";
import { rateLimitResponse, NO_STORE_HEADERS } from "@/lib/rate-limit";

interface Limiter {
  limit: (
    key: string,
  ) => Promise<{ success: boolean; remaining: number; reset: number }>;
}

type UserGateOk = { ok: true; session: Session & { user: { id: string } } };
type UserGateFail = { ok: false; res: Response };

/** The one JSON error shape every user-facing route returns. */
export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json(
    { error: message },
    { status, headers: NO_STORE_HEADERS },
  );
}

/**
 * Require a signed-in user, optionally spending a rate-limit token.
 *
 * Pass the limiter that matches the operation; omit it for reads that
 * don't need metering.
 */
export async function requireUserApi(
  limiter?: Limiter,
): Promise<UserGateOk | UserGateFail> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, res: apiError("Unauthorized", 401) };
  }
  if (limiter) {
    const rl = await limiter.limit(session.user.id);
    if (!rl.success) return { ok: false, res: rateLimitResponse(rl.reset) };
  }
  return { ok: true, session: session as UserGateOk["session"] };
}

type ParsedOk<T> = { ok: true; data: T };
type ParsedFail = { ok: false; res: Response };

/**
 * Parse a JSON request body against a schema.
 *
 * Handles the malformed-JSON case that `/api/favorites` previously let
 * throw into a raw 500, and returns the same `{ error }` 400 shape as
 * every other validation failure.
 */
export async function parseJsonBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<ParsedOk<z.infer<T>> | ParsedFail> {
  const raw = await req.json().catch(() => undefined);
  if (raw === undefined) return { ok: false, res: apiError("Bad input", 400) };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, res: apiError("Bad input", 400) };
  return { ok: true, data: parsed.data };
}

/** Same, for query-string params. */
export function parseQuery<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): ParsedOk<z.infer<T>> | ParsedFail {
  const { searchParams } = new URL(req.url);
  const parsed = schema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return { ok: false, res: apiError("Bad input", 400) };
  return { ok: true, data: parsed.data };
}
