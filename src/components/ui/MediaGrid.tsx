import { cn } from "@/lib/utils";

/**
 * The poster-grid layout, previously copy-pasted as a bare class string
 * across six call sites (movies, tv, genre, favorites, and twice in
 * search) — and already drifted: `search/loading.tsx` used a different
 * column count than `search/page.tsx`, so the skeleton reflowed on
 * hydration.
 */
export const MEDIA_GRID_CLASS =
  "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4";

export default function MediaGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(MEDIA_GRID_CLASS, className)}>{children}</div>;
}
