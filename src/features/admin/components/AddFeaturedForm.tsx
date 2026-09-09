"use client";

import { useState, useTransition } from "react";
import { addFeatured } from "@/features/admin/actions";

export default function AddFeaturedForm() {
  const [tmdbId, setTmdbId] = useState("");
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const id = Number(tmdbId);
    if (!Number.isFinite(id) || id <= 0) {
      setErr("Invalid TMDB ID");
      return;
    }
    startTransition(async () => {
      const result = await addFeatured({ tmdbId: id, mediaType });
      if (!result.ok) {
        setErr(result.error);
        return;
      }
      setTmdbId("");
      // addFeatured revalidates /admin/featured and / itself.
    });
  };

  return (
    <form
      onSubmit={submit}
      className="glass rounded-xl p-4 flex flex-wrap items-end gap-3"
    >
      <div>
        <label
          htmlFor="featured-tmdb-id"
          className="block text-xs text-[var(--color-muted)] mb-1"
        >
          TMDB ID
        </label>
        <input
          id="featured-tmdb-id"
          value={tmdbId}
          onChange={(e) => setTmdbId(e.target.value)}
          placeholder="e.g. 27205"
          inputMode="numeric"
          className="w-32 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
        />
      </div>
      <div>
        <label
          htmlFor="featured-media-type"
          className="block text-xs text-[var(--color-muted)] mb-1"
        >
          Type
        </label>
        <select
          id="featured-media-type"
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value as "movie" | "tv")}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          <option value="movie">Movie</option>
          <option value="tv">TV</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Fetching…" : "Add featured"}
      </button>
      {err && (
        <p className="text-sm text-[var(--color-accent)] basis-full">{err}</p>
      )}
    </form>
  );
}
