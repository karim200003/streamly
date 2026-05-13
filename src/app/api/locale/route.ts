import { NextResponse } from "next/server";
import { isValidLang, LANG_COOKIE } from "@/lib/locale";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const lang = body?.lang;
  if (!isValidLang(lang)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(LANG_COOKIE, lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1y
    sameSite: "lax",
  });
  return res;
}
