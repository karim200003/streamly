import Link from "next/link";
import MediaGrid from "@/components/ui/MediaGrid";
import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { imageUrl } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-16 text-center">
        <h1 className="text-2xl font-semibold">My List</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          Sign in to save movies and shows to your list.
        </p>
        <Link
          href="/sign-in?callbackUrl=/favorites"
          className="btn-primary mt-5"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8">
      <h1 className="page-title">My List</h1>
      <p className="text-[var(--color-muted)] mt-1 text-sm">
        {favorites.length} {favorites.length === 1 ? "title" : "titles"} saved.
      </p>
      {favorites.length === 0 ? (
        <p className="mt-10 text-[var(--color-muted)]">
          Nothing here yet. Browse titles and tap the heart to add them.
        </p>
      ) : (
        <MediaGrid className="mt-6">
          {favorites.map((f) => {
            const poster = imageUrl(f.posterPath, "w500");
            return (
              <Link
                key={f.id}
                href={`/${f.mediaType}/${f.tmdbId}`}
                className="group"
              >
                <div className="relative aspect-[2/3] rounded-[var(--radius-tile)] overflow-hidden bg-[var(--color-bg-2)] border border-white/[0.07] shadow-[0_10px_30px_-14px_rgba(0,0,0,0.9)] transition-[border-color] duration-300 group-hover:border-white/20">
                  {poster ? (
                    <Image
                      src={poster}
                      alt={f.title}
                      fill
                      sizes="(max-width: 768px) 50vw, 200px"
                      className="object-cover transition-transform group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-xs p-4 text-center text-white/60">
                      {f.title}
                    </div>
                  )}
                </div>
                <div className="mt-2.5 text-[0.8125rem] font-medium line-clamp-1 text-white/90">
                  {f.title}
                </div>
                <div className="text-[0.6875rem] text-[var(--color-muted)] mt-0.5">
                  {f.mediaType === "movie" ? "Movie" : "TV"}
                </div>
              </Link>
            );
          })}
        </MediaGrid>
      )}
    </div>
  );
}
