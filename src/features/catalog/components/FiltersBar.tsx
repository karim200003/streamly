"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { sortOptionsFor } from "@/lib/discover-sort";

const RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  { value: "5", label: "5+" },
  { value: "6", label: "6+" },
  { value: "7", label: "7+" },
  { value: "8", label: "8+" },
];

interface Props {
  mediaType: "movie" | "tv";
}

export default function FiltersBar({ mediaType }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  const sort = sp.get("sort") ?? "popularity.desc";
  const year = sp.get("year") ?? "";
  const rating = sp.get("rating") ?? "";

  const sortOptions = sortOptionsFor(mediaType);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 60 }, (_, i) => currentYear - i);

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page"); // reset pagination on filter change
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const reset = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const selectClass =
    "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 hover:bg-white/10 transition disabled:opacity-50";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 mb-6",
        pending && "opacity-70",
      )}
    >
      <select
        value={sort}
        onChange={(e) => update("sort", e.target.value)}
        disabled={pending}
        className={selectClass}
        aria-label="Sort by"
      >
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={year}
        onChange={(e) => update("year", e.target.value)}
        disabled={pending}
        className={selectClass}
        aria-label="Filter by year"
      >
        <option value="">Any year</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <select
        value={rating}
        onChange={(e) => update("rating", e.target.value)}
        disabled={pending}
        className={selectClass}
        aria-label="Minimum rating"
      >
        {RATING_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {(sort !== "popularity.desc" || year || rating) && (
        <button
          onClick={reset}
          disabled={pending}
          className="text-sm text-[var(--color-muted)] hover:text-white px-2"
        >
          Reset
        </button>
      )}
    </div>
  );
}
