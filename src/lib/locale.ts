// Client + server safe — pure constants and validators only.
// Server-only `getServerLang` lives in `./locale-server.ts`.

export const LANGUAGES = [
  { code: "en-US", label: "English" },
  { code: "es-ES", label: "Español" },
  { code: "fr-FR", label: "Français" },
  { code: "de-DE", label: "Deutsch" },
  { code: "it-IT", label: "Italiano" },
  { code: "pt-BR", label: "Português" },
  { code: "ja-JP", label: "日本語" },
  { code: "ko-KR", label: "한국어" },
  { code: "zh-CN", label: "中文" },
  { code: "ar-SA", label: "العربية" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "ru-RU", label: "Русский" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANG: LangCode = "en-US";
export const LANG_COOKIE = "lang";

export function isValidLang(value: string | null | undefined): value is LangCode {
  return !!value && LANGUAGES.some((l) => l.code === value);
}
