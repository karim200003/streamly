"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import type { MediaType } from "@/lib/tmdb-shared";

interface Props {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  season?: number;
  episode?: number;
}

export default function RecordWatch({
  tmdbId,
  mediaType,
  title,
  posterPath,
  season,
  episode,
}: Props) {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const ctrl = new AbortController();
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tmdbId,
        mediaType,
        title,
        posterPath,
        season,
        episode,
      }),
      signal: ctrl.signal,
    }).catch(() => {});
    return () => ctrl.abort();
  }, [status, tmdbId, mediaType, title, posterPath, season, episode]);

  return null;
}
