import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, idempotentDelete } from "@/lib/admin-guard";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.res;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (typeof body?.hidden !== "boolean") {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }
  try {
    await prisma.comment.update({ where: { id }, data: { hidden: body.hidden } });
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[admin] comment PATCH failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.res;

  const { id } = await params;
  const failure = await idempotentDelete(
    () => prisma.comment.delete({ where: { id } }),
    `comment.delete(${id})`,
  );
  if (failure) return failure;
  return NextResponse.json({ ok: true });
}
