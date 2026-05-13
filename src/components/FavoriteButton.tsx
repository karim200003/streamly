"use client";

import { useEffect, useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { MediaType } from "@/lib/tmdb-shared";

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
  const [isFav, setIsFav] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/favorites?tmdbId=${tmdbId}&mediaType=${mediaType}`)
      .then((r) => (r.ok ? r.json() : { exists: false }))
      .then((d) => setIsFav(!!d.exists))
      .catch(() => {});
  }, [tmdbId, mediaType, status]);

  const onClick = () => {
    if (status !== "authenticated") {
      router.push("/sign-in");
      return;
    }
    startTransition(async () => {
      const next = !isFav;
      setIsFav(next);
      await fetch("/api/favorites", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, mediaType, title, posterPath }),
      }).catch(() => setIsFav(!next));
    });
  };

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg transition",
        isFav
          ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90"
          : "glass hover:bg-white/10",
      )}
    >
      <Heart
        className={cn("size-4", isFav && "fill-white")}
      />
      {isFav ? "In My List" : "Add to List"}
    </button>
  );
}
