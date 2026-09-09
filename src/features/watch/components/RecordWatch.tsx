"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import type { MediaType } from "@/lib/tmdb-shared";
import { recordWatch } from "@/features/history/actions";

interface Props {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  season?: number;
  episode?: number;
}

/**
 * Records that the user opened this title, so it shows up in Continue
 * Watching. Deliberately sends no `progress` — the player reports that
 * separately once playback actually starts (see Player.tsx). Sending 0
 * here would overwrite a saved resume position.
 */
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
    // Fire-and-forget: a missed history write isn't worth interrupting
    // playback over.
    void recordWatch({
      tmdbId,
      mediaType,
      title,
      posterPath,
      season,
      episode,
    }).catch(() => {});
  }, [status, tmdbId, mediaType, title, posterPath, season, episode]);

  return null;
}
