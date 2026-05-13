"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { imageUrl, type TmdbEpisode, type TmdbSeason } from "@/lib/tmdb-shared";
import { cn } from "@/lib/utils";

export default function SeasonPicker({
  tvId,
  seasons,
}: {
  tvId: number;
  seasons: TmdbSeason[];
}) {
  const [selected, setSelected] = useState(seasons[0]?.season_number ?? 1);
  const [episodes, setEpisodes] = useState<TmdbEpisode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => !cancelled && setLoading(true));
    fetch(`/api/season?tvId=${tvId}&season=${selected}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setEpisodes(d.episodes ?? []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tvId, selected]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {seasons.map((s) => (
          <button
            key={s.season_number}
            onClick={() => setSelected(s.season_number)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm transition",
              selected === s.season_number
                ? "bg-white text-black"
                : "bg-white/5 hover:bg-white/10",
            )}
          >
            {s.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl skeleton" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {episodes.map((e) => {
            const still = imageUrl(e.still_path, "w300");
            return (
              <Link
                key={e.id}
                href={`/watch/tv/${tvId}?s=${e.season_number}&e=${e.episode_number}`}
                className="group flex gap-3 p-2 rounded-xl glass hover:bg-white/8 transition"
              >
                <div className="relative shrink-0 w-32 aspect-video rounded-lg overflow-hidden bg-white/5">
                  {still ? (
                    <Image
                      src={still}
                      alt={e.name}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-xs text-white/40">
                      Ep {e.episode_number}
                    </div>
                  )}
                  <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                    <Play className="size-6 fill-white" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium line-clamp-1">
                    {e.episode_number}. {e.name}
                  </div>
                  <div className="text-xs text-[var(--color-muted)] line-clamp-2 mt-1">
                    {e.overview || "No description."}
                  </div>
                </div>
              </Link>
            );
          })}
          {episodes.length === 0 && (
            <p className="text-sm text-[var(--color-muted)] col-span-full">
              No episodes available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
