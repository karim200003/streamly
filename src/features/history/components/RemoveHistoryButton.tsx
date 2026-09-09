"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { MediaType } from "@/lib/tmdb-shared";
import { removeFromHistory } from "@/features/history/actions";

interface Props {
  tmdbId: number;
  mediaType: MediaType;
  season: number;
  episode: number;
}

export default function RemoveHistoryButton({
  tmdbId,
  mediaType,
  season,
  episode,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      // The action revalidates /history and / itself, so there's no
      // router.refresh() here any more.
      const result = await removeFromHistory({
        tmdbId,
        mediaType,
        season,
        episode,
      });
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <button
      onClick={onClick}
      disabled={pending}
      title={error ?? "Remove from history"}
      aria-label="Remove from history"
      className="shrink-0 size-8 grid place-items-center rounded-md text-white/50 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
