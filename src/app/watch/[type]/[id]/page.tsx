import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getDetails, type MediaType } from "@/lib/tmdb";
import { getServers } from "@/lib/vidsrc";
import Player from "@/components/Player";
import RecordWatch from "@/components/RecordWatch";

export const dynamic = "force-dynamic";

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

  const mediaType = type as MediaType;
  const season = sp.s ? Number(sp.s) : undefined;
  const episode = sp.e ? Number(sp.e) : undefined;

  const details = await getDetails(mediaType, tmdbId);
  const servers = getServers(mediaType, tmdbId, season, episode);
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
      <Player servers={servers} />
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
