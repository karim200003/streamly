"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  page: number;
  totalPages: number;
}

export default function Pager({ page, totalPages }: Props) {
  const sp = useSearchParams();
  const pathname = usePathname();

  if (totalPages <= 1) return null;

  const buildHref = (p: number) => {
    const params = new URLSearchParams(sp.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const cap = Math.min(totalPages, 500); // TMDB hard caps page at 500
  const prev = Math.max(1, page - 1);
  const next = Math.min(cap, page + 1);

  const btnBase =
    "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition";
  const btnActive = "bg-white/5 hover:bg-white/10";
  const btnDisabled = "opacity-40 pointer-events-none";

  return (
    <nav
      className="flex items-center justify-center gap-2 mt-8 mb-4"
      aria-label="Pagination"
    >
      <Link
        href={buildHref(prev)}
        className={cn(btnBase, page === 1 ? btnDisabled : btnActive)}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
        Previous
      </Link>
      <span className="text-sm text-[var(--color-muted)] px-3">
        Page {page} of {cap}
      </span>
      <Link
        href={buildHref(next)}
        className={cn(btnBase, page >= cap ? btnDisabled : btnActive)}
        aria-label="Next page"
      >
        Next
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}
