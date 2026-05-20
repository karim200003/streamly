import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Two concerns are handled here:
//
//   1. CSRF: NextAuth's session cookie is `sameSite=lax`, which blocks
//      most cross-site POSTs but not all of them. We require Origin to
//      match Host for non-GET requests on our custom API. NextAuth's
//      own routes have their own CSRF token; we exempt them.
//
//   2. Cache hygiene: user-scoped routes (anything that touches the
//      session) must not be cached by browsers, BFCache, or shared
//      proxies. We stamp `Cache-Control: no-store` on all writes and
//      on the GET endpoints that return private data. Pure TMDB-proxy
//      GETs (trailer, search, season, trending-searches) are exempt so
//      Next's revalidate-based caching still works on them.

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// GET paths that return user-scoped data; must never be cached.
const PRIVATE_GET_PATHS = ["/api/favorites", "/api/history", "/api/admin/"];

function isPrivateGet(pathname: string): boolean {
  return PRIVATE_GET_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p),
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  const isAuthRoute = pathname.startsWith("/api/auth/");
  const isWrite = !SAFE_METHODS.has(req.method);

  // 1. CSRF check (skip NextAuth and safe methods).
  if (isWrite && !isAuthRoute) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (!origin || !host) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (originHost !== host) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const res = NextResponse.next();

  // 2. Cache hygiene: write methods and known private GETs.
  if (isWrite || isPrivateGet(pathname)) {
    res.headers.set("Cache-Control", "no-store");
  }

  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
