import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { adminWriteLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("admin");

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/");
  return session;
}

export async function isAdminRequest() {
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

type AdminGateOk = { ok: true; session: Session & { user: { id: string } } };
type AdminGateFail = { ok: false; res: Response };

/**
 * Single source of truth for admin API gating: auth + role check +
 * per-admin rate limit. Returning a discriminated union avoids
 * throwing across the request boundary.
 */
export async function requireAdminApi(
  opts: { rateLimit?: boolean } = { rateLimit: true },
): Promise<AdminGateOk | AdminGateFail> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (session.user.role !== "ADMIN") {
    return {
      ok: false,
      res: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  if (opts.rateLimit !== false) {
    const rl = await adminWriteLimiter.limit(session.user.id);
    if (!rl.success) return { ok: false, res: rateLimitResponse(rl.reset) };
  }
  return { ok: true, session: session as AdminGateOk["session"] };
}

/**
 * Best-effort delete: treats "record not found" (Prisma P2025) as
 * success (idempotent), logs and 500s on any other error.
 */
export async function idempotentDelete(
  fn: () => Promise<unknown>,
  context: string,
): Promise<NextResponse | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "P2025") return null;
    log.error(`${context} failed`, err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
