/**
 * Environment validation, run once at boot from `instrumentation.ts`.
 *
 * Previously this checked only DATABASE_URL and AUTH_SECRET. The gap
 * that actually bites is NEXT_PUBLIC_SITE_URL: it silently falls back to
 * `http://localhost:3000` (see layout.tsx, robots.ts, sitemap.ts), so a
 * deploy that forgets it serves a sitemap, robots.txt, canonical URLs
 * and OG image links all pointing at localhost — with no error anywhere.
 *
 * Secrets are never echoed; only variable names appear in messages.
 */

import { logger } from "./logger";

const log = logger("env");

/** Required for the app to function at all in production. */
const REQUIRED = ["DATABASE_URL", "AUTH_SECRET"] as const;

/**
 * Optional, but a missing value degrades production in a way that is
 * hard to notice from the inside.
 */
const RECOMMENDED: { name: string; why: string }[] = [
  {
    name: "NEXT_PUBLIC_SITE_URL",
    why: "canonical URLs, sitemap.xml, robots.txt and OG images will point at http://localhost:3000",
  },
  {
    name: "TMDB_API_KEY",
    why: "the catalog runs in demo mode with placeholder titles",
  },
  {
    name: "UPSTASH_REDIS_REST_URL",
    why: "rate limits fall back to per-instance in-memory counters",
  },
];

function present(name: string): boolean {
  return !!process.env[name]?.trim();
}

export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const missing = REQUIRED.filter((name) => !present(name));
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  // AUTH_SECRET is the JWT signing key; a short one weakens every session.
  const secret = process.env.AUTH_SECRET ?? "";
  if (secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be at least 32 characters — generate one with `openssl rand -base64 32`",
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    try {
      const parsed = new URL(siteUrl);
      if (parsed.protocol !== "https:") {
        log.warn(
          "NEXT_PUBLIC_SITE_URL is not https — canonical URLs and OG tags will use it verbatim",
          { protocol: parsed.protocol },
        );
      }
    } catch {
      throw new Error(
        `NEXT_PUBLIC_SITE_URL is not a valid absolute URL: ${siteUrl}`,
      );
    }
  }

  for (const { name, why } of RECOMMENDED) {
    if (!present(name)) {
      log.warn(`${name} is unset`, { consequence: why });
    }
  }
}
