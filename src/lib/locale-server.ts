import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, isValidLang, type LangCode } from "./locale";

// Reads the user's chosen language from the cookie. Used to pass
// `language=...` to TMDB so titles / overviews come back translated.
export async function getServerLang(): Promise<LangCode> {
  try {
    const c = await cookies();
    const v = c.get(LANG_COOKIE)?.value;
    return isValidLang(v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}
