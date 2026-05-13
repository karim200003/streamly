import { NextResponse } from "next/server";
import { getSeason } from "@/lib/tmdb";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tvId = Number(searchParams.get("tvId"));
  const season = Number(searchParams.get("season") ?? "1");
  if (!Number.isFinite(tvId)) {
    return NextResponse.json({ error: "bad tvId" }, { status: 400 });
  }
  try {
    const data = await getSeason(tvId, season);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ episodes: [] }, { status: 200 });
  }
}
