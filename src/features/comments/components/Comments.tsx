"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Star, Trash2, MessageSquare } from "lucide-react";
import type { MediaType } from "@/lib/tmdb-shared";
import type { CommentView } from "@/features/comments/queries";
import { cn } from "@/lib/utils";
import { postComment, deleteComment } from "@/features/comments/actions";

export default function Comments({
  tmdbId,
  mediaType,
  initialComments,
}: {
  tmdbId: number;
  mediaType: MediaType;
  /** Rendered on the server, so comments are in the HTML and indexable. */
  initialComments: CommentView[];
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  // Optimistically hidden ids. The list itself is derived from props
  // rather than mirrored into state — copying props into state needs an
  // effect to stay in sync, and that effect is exactly the
  // setState-in-effect pattern React now warns about.
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const items = initialComments.filter((c) => !removedIds.has(c.id));
  const [body, setBody] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const text = body.trim();
    if (!text) {
      setErr("Comment cannot be empty");
      return;
    }
    startTransition(async () => {
      const result = await postComment({
        tmdbId,
        mediaType,
        body: text,
        rating,
      });
      if (!result.ok) {
        setErr(result.error);
        return;
      }
      setBody("");
      setRating(null);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    setErr(null);
    startTransition(async () => {
      const result = await deleteComment(id);
      // Previously the response was ignored, so a failed delete still
      // removed the comment from the list visually.
      if (!result.ok) {
        setErr(result.error);
        return;
      }
      setRemovedIds((prev) => new Set(prev).add(id));
      // Server re-render drops it from `initialComments` for good.
      router.refresh();
    });
  };

  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <section className="mt-12">
      <header className="flex items-center gap-2 mb-4">
        <MessageSquare className="size-5 text-white/60" />
        <h2 className="text-xl font-semibold tracking-tight">
          Comments &amp; Reviews
        </h2>
        <span className="text-sm text-[var(--color-muted)]">
          {items.length}
        </span>
      </header>

      {status === "authenticated" ? (
        <form onSubmit={submit} className="glass rounded-xl p-4 mb-6">
          <textarea
            aria-label="Write a comment"
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
                            ? "fill-white text-white"
                            : "text-white/30 hover:text-white/60",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
              {rating && (
                <span className="text-white">{rating}/10</span>
              )}
            </div>
            <button
              type="submit"
              disabled={pending || body.trim().length === 0}
              className="btn-primary px-5 py-1.5 text-sm disabled:opacity-50"
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

      {items.length === 0 ? (
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
                        <span className="inline-flex items-center gap-1 text-xs text-white/90">
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
                      className="opacity-50 hover:opacity-100 hover:text-white transition p-1"
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
