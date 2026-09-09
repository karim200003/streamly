"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { LANGUAGES, DEFAULT_LANG, LANG_COOKIE, type LangCode } from "@/lib/locale";

function readCookie(): LangCode {
  if (typeof document === "undefined") return DEFAULT_LANG;
  const m = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]+)`));
  const v = m ? decodeURIComponent(m[1]) : DEFAULT_LANG;
  return (LANGUAGES.find((l) => l.code === v)?.code ?? DEFAULT_LANG) as LangCode;
}

export default function LanguagePicker() {
  const router = useRouter();
  const [current, setCurrent] = useState<LangCode>(DEFAULT_LANG);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    queueMicrotask(() => setCurrent(readCookie()));
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value as LangCode;
    setCurrent(lang);
    startTransition(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang }),
      });
      // Force re-fetch of all server components so TMDB returns
      // translated content on the next render.
      router.refresh();
    });
  };

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Display language</span>
      <Globe className="size-4 absolute left-2.5 pointer-events-none text-white/60" />
      <select
        value={current}
        onChange={onChange}
        disabled={pending}
        aria-label="Display language"
        className="pl-8 pr-2 py-1.5 rounded-md text-sm bg-white/5 hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition appearance-none cursor-pointer disabled:opacity-50"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="bg-[var(--color-bg-2)]">
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
