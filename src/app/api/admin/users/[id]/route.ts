import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, idempotentDelete } from "@/lib/admin-guard";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.res;
  const { session } = gate;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const op = body?.op;

  // Self-protection: don't let admins demote/ban themselves and lock themselves out.
  if (id === session.user.id && (op === "demote" || op === "ban")) {
    return NextResponse.json(
      { error: "Refusing to lock yourself out" },
      { status: 400 },
    );
  }

  try {
    switch (op) {
      case "promote":
        await prisma.user.update({ where: { id }, data: { role: "ADMIN" } });
        break;
      case "demote":
        await prisma.user.update({ where: { id }, data: { role: "USER" } });
        break;
      case "ban":
        await prisma.user.update({ where: { id }, data: { banned: true } });
        break;
      case "unban":
        await prisma.user.update({ where: { id }, data: { banned: false } });
        break;
      default:
        return NextResponse.json({ error: "Bad op" }, { status: 400 });
    }
  } catch (err) {
    console.error("[admin] user PATCH failed:", err);
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
  const { session } = gate;

  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account here" },
      { status: 400 },
    );
  }
  const failure = await idempotentDelete(
    () => prisma.user.delete({ where: { id } }),
    `user.delete(${id})`,
  );
  if (failure) return failure;
  return NextResponse.json({ ok: true });
}
