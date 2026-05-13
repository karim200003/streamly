"use client";

import { useEffect, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Star, Trash2, MessageSquare } from "lucide-react";
import type { MediaType } from "@/lib/tmdb-shared";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  body: string;
  rating: number | null;
  createdAt: string;
  user: { id: string; name: string; image: string | null };
}

export default function Comments({
  tmdbId,
  mediaType,
}: {
  tmdbId: number;
  mediaType: MediaType;
}) {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = async () => {
    try {
      const r = await fetch(
        `/api/comments?tmdbId=${tmdbId}&mediaType=${mediaType}`,
      );
      const d = await r.json();
      setItems(d.comments ?? []);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmdbId, mediaType]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const text = body.trim();
    if (!text) {
      setErr("Comment cannot be empty");
      return;
    }
    startTransition(async () => {
      const r = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, mediaType, body: text, rating }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr(d.error ?? "Could not post comment");
        return;
      }
      setBody("");
      setRating(null);
      load();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      await fetch(`/api/comments/${id}`, { method: "DELETE" });
      setItems((prev) => prev?.filter((c) => c.id !== id) ?? null);
    });
  };

  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <section className="mt-12">
      <header className="flex items-center gap-2 mb-4">
        <MessageSquare className="size-5 text-[var(--color-accent)]" />
        <h2 className="text-xl font-semibold tracking-tight">
          Comments &amp; Reviews
        </h2>
        <span className="text-sm text-[var(--color-muted)]">
          {items?.length ?? 0}
        </span>
      </header>

      {status === "authenticated" ? (
        <form onSubmit={submit} className="glass rounded-xl p-4 mb-6">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your thoughts…"
            rows={3}
            maxLength={2000}
            className="w-full bg-transparent border-0 focus:outline-none placeholder:text-white/40 resize-none"
          />
          <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <span>Your rating:</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => {
                  const n = i + 1;
                  const active = rating !== null && n <= rating;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(rating === n ? null : n)}
                      aria-label={`Rate ${n}/10`}
                      className="p-0.5"
                    >
                      <Star
                        className={cn(
                          "size-4 transition",
                          active
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-white/30 hover:text-white/60",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
              {rating && (
                <span className="text-yellow-400">{rating}/10</span>
              )}
            </div>
            <button
              type="submit"
              disabled={pending || body.trim().length === 0}
              className="px-4 py-1.5 rounded-md bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-sm font-medium disabled:opacity-50"
            >
              {pending ? "Posting…" : "Post"}
            </button>
          </div>
          {err && (
            <p className="mt-2 text-sm text-[var(--color-accent)]" role="alert">
              {err}
            </p>
          )}
        </form>
      ) : (
        <p className="text-sm text-[var(--color-muted)] mb-6">
          <Link href="/sign-in" className="text-white hover:underline">
            Sign in
          </Link>{" "}
          to post a comment or review.
        </p>
      )}

      {items === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl skeleton" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          No comments yet. Be the first.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => {
            const canDelete = c.user.id === session?.user?.id || isAdmin;
            return (
              <li key={c.id} className="glass rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0 size-9 rounded-full bg-white/10 overflow-hidden grid place-items-center text-sm font-medium uppercase">
                    {c.user.image ? (
                      <Image
                        src={c.user.image}
                        alt={c.user.name}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : (
                      c.user.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {c.user.name}
                      </span>
                      {c.rating != null && (
                        <span className="inline-flex items-center gap-1 text-xs text-yellow-400">
                          <Star className="size-3 fill-yellow-400" />
                          {c.rating}/10
                        </span>
                      )}
                      <span className="text-xs text-[var(--color-muted)]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-white/85 whitespace-pre-line break-words">
                      {c.body}
                    </p>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => remove(c.id)}
                      disabled={pending}
                      aria-label="Delete comment"
                      className="opacity-50 hover:opacity-100 hover:text-[var(--color-accent)] transition p-1"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
