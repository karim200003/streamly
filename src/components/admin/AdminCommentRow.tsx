"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  comment: {
    id: string;
    body: string;
    rating: number | null;
    tmdbId: number;
    mediaType: string;
    hidden: boolean;
    createdAt: string;
    user: { id: string; name: string | null; email: string | null };
  };
}

export default function AdminCommentRow({ comment }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggleHidden = () => {
    startTransition(async () => {
      await fetch(`/api/admin/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !comment.hidden }),
      });
      router.refresh();
    });
  };

  const remove = () => {
    if (!confirm("Permanently delete this comment?")) return;
    startTransition(async () => {
      await fetch(`/api/admin/comments/${comment.id}`, { method: "DELETE" });
      router.refresh();
    });
  };

  return (
    <li
      className={cn(
        "glass rounded-xl p-4",
        comment.hidden && "opacity-50",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--color-muted)]">
            <span className="text-white/80 font-medium">
              {comment.user.name ?? comment.user.email}
            </span>
            <span>·</span>
            <Link
              href={`/${comment.mediaType}/${comment.tmdbId}`}
              className="hover:underline"
            >
              {comment.mediaType}/{comment.tmdbId}
            </Link>
            {comment.rating != null && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5 text-yellow-400">
                  <Star className="size-3 fill-yellow-400" />
                  {comment.rating}/10
                </span>
              </>
            )}
            <span>·</span>
            <span>{new Date(comment.createdAt).toLocaleString()}</span>
            {comment.hidden && (
              <>
                <span>·</span>
                <span className="text-red-400">Hidden</span>
              </>
            )}
          </div>
          <p className="mt-1 text-sm text-white/85 whitespace-pre-line break-words">
            {comment.body}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleHidden}
            disabled={pending}
            aria-label={comment.hidden ? "Unhide" : "Hide"}
            className="p-1.5 rounded-md hover:bg-white/10 transition"
          >
            {comment.hidden ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
          <button
            onClick={remove}
            disabled={pending}
            aria-label="Delete"
            className="p-1.5 rounded-md hover:bg-red-500/20 hover:text-red-400 transition"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </li>
  );
}
