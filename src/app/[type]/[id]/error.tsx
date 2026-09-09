"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function DetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // console, not lib/logger: this is a Client Component and the
    // logger is server-only. Next also reports the digest server-side.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-4rem)] grid place-items-center px-4 text-center">
      <div className="max-w-md">
        <AlertTriangle className="mx-auto size-12 text-[var(--color-accent)] mb-4" />
        <h1 className="text-2xl font-bold tracking-tight">Couldn&apos;t load this title</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          The content may be unavailable or there was a network issue.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-full bg-white text-black font-semibold hover:bg-white/90 active:scale-[0.97] transition"
          >
            Retry
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-full glass hover:bg-white/10 active:scale-[0.97] transition"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
