import { NextResponse } from "next/server";
import { getTrendingSearches } from "@/lib/tmdb";

export const revalidate = 1800;

export async function GET() {
  try {
    const results = await getTrendingSearches();
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
