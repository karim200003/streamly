import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { imageUrl } from "@/lib/tmdb";
import FeaturedActions from "@/features/admin/components/FeaturedActions";
import AddFeaturedForm from "@/features/admin/components/AddFeaturedForm";

export const dynamic = "force-dynamic";

export default async function AdminFeaturedPage() {
  const items = await prisma.featured.findMany({
    orderBy: [{ active: "desc" }, { position: "asc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Featured hero override</h2>
      <p className="text-sm text-[var(--color-muted)] mb-6 max-w-2xl">
        Pick a movie or show by TMDB ID. Active items override the homepage hero
        banner — the lowest-position active item wins. Disable an item to fall
        back to TMDB trending.
      </p>

      <div className="mb-6">
        <AddFeaturedForm />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          No featured items. Add one above.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => {
            const poster = imageUrl(it.posterPath, "w200");
            return (
              <li
                key={it.id}
                className="glass rounded-xl p-3 flex items-center gap-4"
              >
                <div className="relative shrink-0 w-12 aspect-[2/3] rounded bg-white/5 overflow-hidden">
                  {poster && (
                    <Image
                      src={poster}
                      alt={it.title}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{it.title}</div>
                  <div className="text-xs text-[var(--color-muted)]">
                    {it.mediaType} · TMDB {it.tmdbId} · pos {it.position}
                    {!it.active && " · disabled"}
                  </div>
                </div>
                <FeaturedActions
                  id={it.id}
                  active={it.active}
                  position={it.position}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
