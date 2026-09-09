import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getBasicDetails, type MediaType } from "@/lib/tmdb";
import { getServers } from "@/lib/vidsrc";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getServerLang } from "@/lib/locale-server";
import Player from "@/features/watch/components/Player";
import RecordWatch from "@/features/watch/components/RecordWatch";

export const dynamic = "force-dynamic";

// Minimum stored progress (seconds) before we attempt resume — avoids
// jumping to "00:03" after an accidental click on a previous nav.
const RESUME_MIN_SECONDS = 15;
// Don't resume if the user was within this many seconds of the end —
// they probably want to start fresh next time.
const RESUME_EDGE_SECONDS = 90;

/**
 * Saved playback position for this user/title/episode, or `undefined`
 * when there is nothing worth resuming. Cheap: served by the unique
 * (userId, tmdbId, mediaType, season, episode) compound index.
 */
async function resolveResumePoint(
  mediaType: MediaType,
  tmdbId: number,
  season: number | undefined,
  episode: number | undefined,
): Promise<number | undefined> {
  const session = await auth();
  if (!session?.user?.id) return undefined;

  const seasonKey = mediaType === "tv" ? Number(season ?? 0) : 0;
  const episodeKey = mediaType === "tv" ? Number(episode ?? 0) : 0;
  const hist = await prisma.watchHistory.findUnique({
    where: {
      userId_tmdbId_mediaType_season_episode: {
        userId: session.user.id,
        tmdbId,
        mediaType,
        season: seasonKey,
        episode: episodeKey,
      },
    },
    select: { progress: true, duration: true },
  });
  if (!hist || hist.progress < RESUME_MIN_SECONDS) return undefined;

  const remaining = hist.duration - hist.progress;
  // Resume unless we're near the credits (or we don't know the duration).
  if (hist.duration && remaining <= RESUME_EDGE_SECONDS) return undefined;
  return Math.floor(hist.progress);
}

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{ s?: string; e?: string }>;
}) {
  const { type, id } = await params;
  const sp = await searchParams;
  if (type !== "movie" && type !== "tv") notFound();
  const tmdbId = Number(id);
  if (!Number.isFinite(tmdbId)) notFound();

  const mediaType: MediaType = type;
  const season = sp.s ? Number(sp.s) : undefined;
  const episode = sp.e ? Number(sp.e) : undefined;

  // Resume lookup and the TMDB metadata fetch are independent, so run
  // them concurrently — the TMDB round-trip is the slowest leg of this
  // page and it has no reason to wait on the session or the DB read.
  const [startTime, dsLangRaw, details] = await Promise.all([
    resolveResumePoint(mediaType, tmdbId, season, episode),
    getServerLang(),
    getBasicDetails(mediaType, tmdbId),
  ]);

  const dsLang = dsLangRaw.split("-")[0];
  const servers = getServers(mediaType, tmdbId, season, episode, {
    startTime,
    dsLang,
  });
  const title = details.title ?? details.name ?? "Untitled";

  return (
    <div className="min-h-[calc(100vh-4rem)] -mt-16 pt-16 bg-black">
      <div className="px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between">
        <Link
          href={`/${mediaType}/${tmdbId}`}
          className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white"
        >
          <ChevronLeft className="size-4" />
          Back to details
        </Link>
        <div className="text-sm text-white/70 truncate max-w-[60%] text-right">
          {title}
          {mediaType === "tv" && season && episode && (
            <span className="ml-2 text-white/50">
              · S{season} E{episode}
            </span>
          )}
        </div>
      </div>
      <Player
        servers={servers}
        media={{
          tmdbId,
          mediaType,
          title,
          posterPath: details.poster_path,
          season,
          episode,
        }}
      />
      <RecordWatch
        tmdbId={tmdbId}
        mediaType={mediaType}
        title={title}
        posterPath={details.poster_path}
        season={season}
        episode={episode}
      />
    </div>
  );
}
