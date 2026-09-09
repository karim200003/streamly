"use client";

import { useEffect, useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { MediaType } from "@/lib/tmdb-shared";
import {
  addFavorite,
  removeFavorite,
  isFavorite,
} from "@/features/favorites/actions";

interface Props {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
}

export default function FavoriteButton({
  tmdbId,
  mediaType,
  title,
  posterPath,
}: Props) {
  const { status } = useSession();
  const router = useRouter();
  // `null` = we haven't established the state yet, so the label stays
  // neutral instead of flashing "Add to List" for an already-saved title.
  const [isFav, setIsFav] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // Signed-out state is derived below rather than written here — a
    // synchronous setState in an effect is an extra render for something
    // already knowable from `status`.
    if (status !== "authenticated") return;
    let cancelled = false;
    isFavorite(tmdbId, mediaType)
      .then((v) => {
        if (!cancelled) setIsFav(v);
      })
      .catch(() => {
        if (!cancelled) setIsFav(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tmdbId, mediaType, status]);

  const onClick = () => {
    if (status !== "authenticated") {
      router.push("/sign-in");
      return;
    }
    const next = !isFav;
    setError(null);
    setIsFav(next); // optimistic
    startTransition(async () => {
      const result = next
        ? await addFavorite({ tmdbId, mediaType, title, posterPath })
        : await removeFavorite({ tmdbId, mediaType });
      // The old version only rolled back on a network throw, so a 401 or
      // 429 resolved normally and left the button showing the wrong state.
      if (!result.ok) {
        setIsFav(!next);
        setError(result.error);
      }
    });
  };

  // Signed-out users see the neutral state; signed-in users wait for the
  // lookup so the label can't flash the wrong value.
  const saved = status === "authenticated" && isFav === true;
  const ready = status !== "authenticated" || isFav !== null;

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        onClick={onClick}
        disabled={pending || !ready}
        aria-pressed={saved}
        className={cn(
          "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg transition disabled:opacity-60",
          saved
            ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90"
            : "glass hover:bg-white/10",
        )}
      >
        <Heart className={cn("size-4", saved && "fill-white")} />
        {saved ? "In My List" : "Add to List"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-300">
          {error}
        </span>
      )}
    </div>
  );
}
