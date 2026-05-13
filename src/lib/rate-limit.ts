import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// If Upstash creds are present we use distributed Redis-backed limiting
// (safe across serverless/multi-pod). Otherwise we fall back to an
// in-process map — fine for `npm run dev` and single-instance prod, but
// each pod gets its own counter on horizontal deploys.
const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

interface Limiter {
  limit: (
    key: string,
  ) => Promise<{
    success: boolean;
    remaining: number;
    reset: number;
  }>;
}

function inMemoryLimiter(maxRequests: number, windowMs: number): Limiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    async limit(key: string) {
      const now = Date.now();
      const b = buckets.get(key);
      if (!b || b.resetAt < now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return {
          success: true,
          remaining: maxRequests - 1,
          reset: now + windowMs,
        };
      }
      if (b.count >= maxRequests) {
        return { success: false, remaining: 0, reset: b.resetAt };
      }
      b.count += 1;
      return {
        success: true,
        remaining: maxRequests - b.count,
        reset: b.resetAt,
      };
    },
  };
}

function build(maxRequests: number, windowSeconds: number, prefix: string): Limiter {
  if (hasUpstash) {
    const redis = Redis.fromEnv();
    const rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
      prefix,
      analytics: true,
    });
    return {
      async limit(key) {
        const r = await rl.limit(key);
        return { success: r.success, remaining: r.remaining, reset: r.reset };
      },
    };
  }
  return inMemoryLimiter(maxRequests, windowSeconds * 1000);
}

// Tight: registration is a write that creates rows in the DB.
export const registerLimiter = build(5, 60 * 60, "rl:register"); // 5 / hr / IP

// Looser: search is a read that proxies TMDB; protect TMDB quota.
export const searchLimiter = build(60, 60, "rl:search"); // 60 / min / IP

// Auth attempts (credentials login) — slow brute-force.
export const loginLimiter = build(10, 5 * 60, "rl:login"); // 10 / 5min / IP

// Authenticated writes — per user (safe across IP / NAT).
export const commentsPostLimiter = build(25, 60 * 60, "rl:comments:post");
export const commentsDeleteLimiter = build(40, 60 * 60, "rl:comments:del");
export const favoritesWriteLimiter = build(80, 60 * 60, "rl:fav:write");
export const historyWriteLimiter = build(200, 60 * 60, "rl:hist:write");

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export function rateLimitResponse(reset: number) {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return new Response(
    JSON.stringify({ error: "Too many requests", retryAfter }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    },
  );
}
