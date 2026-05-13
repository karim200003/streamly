"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  tmdbId: number;
  mediaType: "movie" | "tv";
  season: number;
  episode: number;
}

export default function RemoveHistoryButton({
  tmdbId,
  mediaType,
  season,
  episode,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, mediaType, season, episode }),
      }).catch(() => {});
      router.refresh();
    });
  };

  return (
    <button
      onClick={onClick}
      disabled={pending}
      aria-label="Remove from Continue Watching"
      className="opacity-60 hover:opacity-100 hover:bg-white/10 rounded-md p-1 transition disabled:opacity-30"
    >
      <X className="size-4" />
    </button>
  );
}
