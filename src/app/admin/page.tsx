import { prisma } from "@/lib/prisma";
import { Users, Heart, MessageSquare, Eye, Star, Ban } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [
    userCount,
    adminCount,
    bannedCount,
    favoriteCount,
    historyCount,
    commentCount,
    featuredCount,
    recentUsers,
    topMovies,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { banned: true } }),
    prisma.favorite.count(),
    prisma.watchHistory.count(),
    prisma.comment.count(),
    prisma.featured.count({ where: { active: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
    prisma.favorite.groupBy({
      by: ["tmdbId", "mediaType", "title"],
      _count: { _all: true },
      orderBy: { _count: { tmdbId: "desc" } },
      take: 5,
    }),
  ]);

  const stats = [
    { label: "Users", value: userCount, icon: Users },
    { label: "Admins", value: adminCount, icon: Star },
    { label: "Banned", value: bannedCount, icon: Ban },
    { label: "Favorites", value: favoriteCount, icon: Heart },
    { label: "Watches", value: historyCount, icon: Eye },
    { label: "Comments", value: commentCount, icon: MessageSquare },
    { label: "Featured", value: featuredCount, icon: Star },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="glass rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <div className="text-xs text-[var(--color-muted)] uppercase tracking-wide">
                {s.label}
              </div>
              <div className="text-2xl font-bold mt-1">{s.value}</div>
            </div>
            <s.icon className="size-6 text-white/30" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)] mb-3">
            Recent sign-ups
          </h2>
          {recentUsers.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No users yet.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {recentUsers.map((u) => (
                <li key={u.id} className="py-2.5 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {u.name ?? u.email ?? "—"}
                    </div>
                    <div className="text-xs text-[var(--color-muted)] truncate">
                      {u.email} · {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {u.role === "ADMIN" && (
                    <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)]">
                      Admin
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)] mb-3">
            Most-favorited
          </h2>
          {topMovies.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              No favorites yet.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {topMovies.map((t, i) => (
                <li
                  key={`${t.tmdbId}-${t.mediaType}`}
                  className="py-2.5 flex items-center gap-3"
                >
                  <span className="text-sm text-[var(--color-muted)] w-5">
                    {i + 1}
                  </span>
                  <span className="text-sm flex-1 truncate">{t.title}</span>
                  <span className="text-xs text-[var(--color-muted)] uppercase">
                    {t.mediaType}
                  </span>
                  <span className="text-sm font-medium">
                    {t._count._all}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
