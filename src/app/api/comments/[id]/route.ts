import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  commentsDeleteLimiter,
  rateLimitResponse,
} from "@/lib/rate-limit";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = await commentsDeleteLimiter.limit(session.user.id);
  if (!rl.success) return rateLimitResponse(rl.reset);

  const { id } = await params;
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) {
    return NextResponse.json({ ok: true });
  }
  // Owner or admin can delete.
  const isOwner = comment.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (isAdmin && !isOwner) {
    // Admins soft-hide rather than delete (preserves audit trail).
    await prisma.comment.update({ where: { id }, data: { hidden: true } });
  } else {
    await prisma.comment.delete({ where: { id } });
  }
  return NextResponse.json({ ok: true });
}
