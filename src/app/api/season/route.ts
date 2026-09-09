import { NextResponse } from "next/server";
import { getSeason } from "@/lib/tmdb";
import {
  searchLimiter,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

// TMDB caps seasons well below this; the bound just keeps nonsense out
// of the upstream URL.
const MAX_SEASON = 1000;

export async function GET(req: Request) {
  // This route is unauthenticated and proxies TMDB, so without a limiter
  // it is an open amplifier against our API quota. Shares the search
  // bucket, which exists for exactly this reason.
  const rl = await searchLimiter.limit(getClientIp(req));
  if (!rl.success) return rateLimitResponse(rl.reset);

  const { searchParams } = new URL(req.url);
  const tvId = Number(searchParams.get("tvId"));
  const season = Number(searchParams.get("season") ?? "1");

  if (!Number.isInteger(tvId) || tvId <= 0) {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }
  // Previously unvalidated: `?season=abc` became NaN and was interpolated
  // straight into the TMDB path.
  if (!Number.isInteger(season) || season < 0 || season > MAX_SEASON) {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }

  try {
    const data = await getSeason(tvId, season);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ episodes: [] }, { status: 200 });
  }
}
