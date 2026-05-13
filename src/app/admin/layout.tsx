import Link from "next/link";
import { LayoutDashboard, Users, Star, MessageSquare } from "lucide-react";
import { requireAdmin } from "@/lib/admin-guard";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/featured", label: "Featured", icon: Star },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8">
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="px-2 py-0.5 rounded-md bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs font-medium uppercase tracking-wide">
            Admin
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
          <aside>
            <nav className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-white/5 hover:bg-white/10 transition"
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <section>{children}</section>
        </div>
      </div>
    </div>
  );
}
