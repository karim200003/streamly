import Link from "next/link";
import { watchHref } from "@/lib/watch-href";
import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { imageUrl } from "@/lib/tmdb";
import RemoveHistoryButton from "@/features/history/components/RemoveHistoryButton";

export const dynamic = "force-dynamic";

/** Matches the cap used by GET /api/history. */
const MAX_HISTORY_ITEMS = 100;

export default async function HistoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-16 text-center">
        <h1 className="text-2xl font-semibold">Watch History</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          Sign in to see your watch history.
        </p>
        <Link
          href="/sign-in?callbackUrl=/history"
          className="btn-primary mt-5"
        >
          Sign in
        </Link>
      </div>
    );
  }

  // Bounded: this findMany had no `take`, so a heavy account would load
  // its entire history into one server render.
  const items = await prisma.watchHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: MAX_HISTORY_ITEMS,
  });

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8">
      <h1 className="page-title">Watch History</h1>
      <p className="text-[var(--color-muted)] mt-1 text-sm">
        {items.length} {items.length === 1 ? "item" : "items"}
      </p>
      {items.length === 0 ? (
        <p className="mt-10 text-[var(--color-muted)]">
          Nothing watched yet.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-white/5">
          {items.map((it) => {
            const poster = imageUrl(it.posterPath, "w200");
            const detailsHref = `/${it.mediaType}/${it.tmdbId}`;
            return (
              <li
                key={it.id}
                className="py-3 flex items-center gap-4"
              >
                <Link
                  href={detailsHref}
                  className="relative shrink-0 w-16 aspect-[2/3] rounded-[var(--radius-tile)] overflow-hidden bg-[var(--color-bg-2)] border border-white/[0.07]"
                >
                  {poster && (
                    <Image
                      src={poster}
                      alt={it.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={detailsHref} className="text-sm font-medium hover:underline line-clamp-1">
                    {it.title}
                  </Link>
                  <div className="text-xs text-[var(--color-muted)]">
                    {it.mediaType === "tv" && it.season > 0 && it.episode > 0
                      ? `Season ${it.season} · Episode ${it.episode}`
                      : "Movie"}
                    {" · "}
                    {new Date(it.updatedAt).toLocaleString()}
                  </div>
                </div>
                <Link
                  href={watchHref(it)}
                  className="px-4 py-1.5 rounded-full glass hover:bg-white/15 text-sm font-medium transition"
                >
                  Resume
                </Link>
                <RemoveHistoryButton
                  tmdbId={it.tmdbId}
                  mediaType={it.mediaType}
                  season={it.season}
                  episode={it.episode}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
