-- Drop the single-column userId index — fully covered by the new composite.
DROP INDEX IF EXISTS "WatchHistory_userId_idx";

-- Composite index on (userId, updatedAt DESC) backs the "Continue
-- watching" rail. Postgres can serve `ORDER BY updatedAt DESC
-- WHERE userId = ? LIMIT 30` as an index range scan with no sort.
CREATE INDEX "WatchHistory_userId_updatedAt_idx"
  ON "WatchHistory" ("userId", "updatedAt" DESC);
