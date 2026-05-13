import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  registerLimiter,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await registerLimiter.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);

  try {
    const { email, password, name } = await req.json();
    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const normalized = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (password.length < 10) {
      return NextResponse.json(
        { error: "Password must be at least 10 characters" },
        { status: 400 },
      );
    }
    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: normalized,
        password: hash,
        name: typeof name === "string" ? name.trim() || null : null,
      },
    });
    return NextResponse.json({ id: user.id });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
