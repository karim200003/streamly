import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function gate() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await gate();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await gate();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account here" },
      { status: 400 },
    );
  }
  await prisma.user.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
