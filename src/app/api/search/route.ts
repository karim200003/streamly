import { NextResponse } from "next/server";
import { search } from "@/lib/tmdb";
import {
  searchLimiter,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = await searchLimiter.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  try {
    const results = await search(q);
    return NextResponse.json({ results });
  } catch (e) {
    const dev =
      process.env.NODE_ENV === "development" && e instanceof Error;
    return NextResponse.json({
      results: [],
      ...(dev ? { _devError: e.message } : {}),
    });
  }
}
