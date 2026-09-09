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
    // Deliberately NOT httpOnly: LanguagePicker seeds its <select> from
    // document.cookie on mount. This holds a display-language preference
    // — no secret, no credential — so httpOnly would break that read
    // while protecting nothing.
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
