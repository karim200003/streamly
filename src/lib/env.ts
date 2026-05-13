/**
 * Fail fast in production when core secrets are missing.
 * TMDB is optional (demo mode); Upstash and Google OAuth are optional.
 */
export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;
  const missing: string[] = [];
  if (!process.env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");
  if (!process.env.AUTH_SECRET?.trim()) missing.push("AUTH_SECRET");
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}
