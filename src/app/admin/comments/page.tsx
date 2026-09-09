import { prisma } from "@/lib/prisma";
import AdminCommentRow from "@/features/admin/components/AdminCommentRow";

export const dynamic = "force-dynamic";

export default async function AdminCommentsPage() {
  const comments = await prisma.comment.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">
        Comments ({comments.length})
      </h2>
      {comments.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No comments yet.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <AdminCommentRow
              key={c.id}
              comment={{
                id: c.id,
                body: c.body,
                rating: c.rating,
                tmdbId: c.tmdbId,
                mediaType: c.mediaType,
                hidden: c.hidden,
                createdAt: c.createdAt.toISOString(),
                user: {
                  id: c.user.id,
                  name: c.user.name,
                  email: c.user.email,
                },
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
