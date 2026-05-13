import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function gate() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return false;
  return true;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await gate())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (typeof body?.hidden !== "boolean") {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }
  await prisma.comment.update({ where: { id }, data: { hidden: body.hidden } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await gate())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.comment.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
