import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { imageUrl } from "@/lib/tmdb";
import RemoveHistoryButton from "./RemoveHistoryButton";

export default async function ContinueWatching() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const items = await prisma.watchHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

  if (items.length === 0) return null;

  return (
    <section className="px-4 sm:px-6 lg:px-10 py-6">
      <h2 className="text-lg sm:text-xl font-semibold tracking-tight mb-3">
        Continue Watching
      </h2>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
        {items.map((it) => {
          const poster = imageUrl(it.posterPath, "w500");
          const watchHref =
            it.mediaType === "tv" && it.season > 0 && it.episode > 0
              ? `/watch/tv/${it.tmdbId}?s=${it.season}&e=${it.episode}`
              : `/watch/${it.mediaType}/${it.tmdbId}`;
          const pct =
            it.duration > 0
              ? Math.min(100, Math.max(0, (it.progress / it.duration) * 100))
              : 0;
          return (
            <div
              key={it.id}
              className="group relative shrink-0 w-[200px] sm:w-[240px]"
            >
              <Link href={watchHref} className="block">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-[var(--color-bg-2)] border border-white/5 shadow-lg shadow-black/40">
                  {poster ? (
                    <Image
                      src={poster}
                      alt={it.title}
                      fill
                      sizes="(max-width: 640px) 200px, 240px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-xs text-white/60 p-4 text-center">
                      {it.title}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
                  <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition">
                    <div className="size-12 rounded-full bg-white/95 grid place-items-center">
                      <Play className="size-5 fill-black text-black" />
                    </div>
                  </div>
                  {pct > 0 && (
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
                      <div
                        className="h-full bg-[var(--color-accent)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              </Link>
              <div className="mt-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium line-clamp-1">
                    {it.title}
                  </div>
                  <div className="text-xs text-[var(--color-muted)]">
                    {it.mediaType === "tv" && it.season > 0 && it.episode > 0
                      ? `S${it.season} · E${it.episode}`
                      : "Movie"}
                  </div>
                </div>
                <RemoveHistoryButton
                  tmdbId={it.tmdbId}
                  mediaType={it.mediaType as "movie" | "tv"}
                  season={it.season}
                  episode={it.episode}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
