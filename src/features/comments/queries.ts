import "server-only";
import { prisma } from "@/lib/prisma";
import type { MediaType } from "@/lib/tmdb-shared";

/** Most recent comments shown on a title page. */
const MAX_COMMENTS = 100;

export interface CommentView {
  id: string;
  body: string;
  rating: number | null;
  createdAt: string;
  user: { id: string; name: string; image: string | null };
}

/**
 * Public comments for a title.
 *
 * Projects the user down to a display name deliberately: the raw row
 * carries an email, and only the local part is ever exposed as a
 * fallback when someone has no display name set.
 */
export async function getComments(
  tmdbId: number,
  mediaType: MediaType,
): Promise<CommentView[]> {
  const rows = await prisma.comment.findMany({
    where: { tmdbId, mediaType, hidden: false },
    orderBy: { createdAt: "desc" },
    take: MAX_COMMENTS,
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    body: c.body,
    rating: c.rating,
    createdAt: c.createdAt.toISOString(),
    user: {
      id: c.user.id,
      name:
        c.user.name ??
        (c.user.email ? c.user.email.split("@")[0] : "Anonymous"),
      image: c.user.image,
    },
  }));
}
