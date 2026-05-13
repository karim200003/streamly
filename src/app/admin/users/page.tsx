import { prisma } from "@/lib/prisma";
import UserActions from "@/components/admin/UserActions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      banned: true,
      createdAt: true,
      _count: { select: { favorites: true, history: true, comments: true } },
    },
  });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">
        Users ({users.length})
      </h2>
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-muted)] border-b border-white/5">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Favorites</th>
                <th className="px-4 py-3 text-right">Watches</th>
                <th className="px-4 py-3 text-right">Comments</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5"
                >
                  <td className="px-4 py-3 min-w-0">
                    <div className="font-medium truncate">
                      {u.name ?? "—"}
                    </div>
                    <div className="text-xs text-[var(--color-muted)] truncate">
                      {u.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.role === "ADMIN"
                          ? "text-xs px-2 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
                          : "text-xs px-2 py-0.5 rounded bg-white/5 text-white/70"
                      }
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.banned ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                        Banned
                      </span>
                    ) : (
                      <span className="text-xs text-white/60">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {u._count.favorites}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {u._count.history}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {u._count.comments}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-muted)]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <UserActions
                      userId={u.id}
                      role={u.role}
                      banned={u.banned}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
