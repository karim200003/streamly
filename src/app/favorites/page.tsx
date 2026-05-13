import Link from "next/link";
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
          className="inline-block mt-5 px-5 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90"
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
      <h1 className="font-display italic text-4xl sm:text-5xl tracking-tight text-white">
        My List
      </h1>
      <p className="text-[var(--color-muted)] mt-1">
        {favorites.length} {favorites.length === 1 ? "title" : "titles"} saved.
      </p>
      {favorites.length === 0 ? (
        <p className="mt-10 text-[var(--color-muted)]">
          Nothing here yet. Browse titles and tap the heart to add them.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {favorites.map((f) => {
            const poster = imageUrl(f.posterPath, "w500");
            return (
              <Link
                key={f.id}
                href={`/${f.mediaType}/${f.tmdbId}`}
                className="group"
              >
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/5">
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
                <div className="mt-2 text-sm font-medium line-clamp-1">
                  {f.title}
                </div>
                <div className="text-xs text-[var(--color-muted)]">
                  {f.mediaType === "movie" ? "Movie" : "TV"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
