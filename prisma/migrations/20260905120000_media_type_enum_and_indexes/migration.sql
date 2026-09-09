-- Promote `mediaType` from a bare String to a domain enum, and align the
-- indexes with the queries that actually run.
--
-- NOTE: written by hand rather than taken from `prisma migrate diff`.
-- The generated diff emitted `DROP COLUMN "mediaType", ADD COLUMN
-- "mediaType" "MediaType" NOT NULL` for each table, which discards every
-- existing value and fails outright on a non-empty table. An in-place
-- `ALTER COLUMN ... TYPE ... USING` preserves the data.
--
-- The USING cast fails loudly if any row holds something other than
-- 'movie' or 'tv'. That is the desired behaviour: the migration aborts
-- in a transaction rather than silently dropping rows. Every writer has
-- validated this column against those two values, so the cast should be
-- clean.

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('movie', 'tv');

-- AlterTable: in-place type change, data preserved.
-- Postgres rebuilds dependent indexes and unique constraints automatically.
ALTER TABLE "Favorite"
  ALTER COLUMN "mediaType" TYPE "MediaType" USING "mediaType"::"MediaType";

ALTER TABLE "WatchHistory"
  ALTER COLUMN "mediaType" TYPE "MediaType" USING "mediaType"::"MediaType";

ALTER TABLE "Comment"
  ALTER COLUMN "mediaType" TYPE "MediaType" USING "mediaType"::"MediaType";

ALTER TABLE "Featured"
  ALTER COLUMN "mediaType" TYPE "MediaType" USING "mediaType"::"MediaType";

-- DropIndex: superseded by the composite variants below.
DROP INDEX IF EXISTS "Favorite_userId_idx";
DROP INDEX IF EXISTS "Comment_tmdbId_mediaType_createdAt_idx";
DROP INDEX IF EXISTS "Comment_userId_idx";

-- CreateIndex
-- Favorites are read as `where userId / order by createdAt desc`. The
-- old single-column index left Postgres doing a sort; this mirrors the
-- fix already applied to WatchHistory.
CREATE INDEX "Favorite_userId_createdAt_idx"
  ON "Favorite"("userId", "createdAt" DESC);

-- Public comment reads: `where tmdbId, mediaType, hidden=false
-- order by createdAt desc`.
CREATE INDEX "Comment_tmdbId_mediaType_createdAt_idx"
  ON "Comment"("tmdbId", "mediaType", "createdAt" DESC);

CREATE INDEX "Comment_userId_createdAt_idx"
  ON "Comment"("userId", "createdAt" DESC);

-- Admin lists sort users and comments by newest first.
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt" DESC);
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt" DESC);
