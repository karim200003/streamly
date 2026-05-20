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
  if (!body) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.position === "number") data.position = body.position;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  try {
    await prisma.featured.update({ where: { id }, data });
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[admin] featured PATCH failed:", err);
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
    () => prisma.featured.delete({ where: { id } }),
    `featured.delete(${id})`,
  );
  if (failure) return failure;
  return NextResponse.json({ ok: true });
}
