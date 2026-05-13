import type { MetadataRoute } from "next";
import { getTrending, getPopularMovies, getPopularTv } from "@/lib/tmdb";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/movies",
    "/tv",
    "/search",
    "/sign-in",
  ].map((path) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: path === "" ? 1 : 0.7,
  }));

  // Best-effort: include the top trending titles. If TMDB is unset
  // (dev without key), this just falls back to the static routes.
  let dynamicRoutes: MetadataRoute.Sitemap = [];
  try {
    const [trend, movies, tv] = await Promise.all([
      getTrending("week"),
      getPopularMovies(),
      getPopularTv(),
    ]);
    const items = [...trend, ...movies, ...tv];
    const seen = new Set<string>();
    dynamicRoutes = items
      .map((m) => {
        const type = m.media_type ?? (m.title ? "movie" : "tv");
        const key = `${type}-${m.id}`;
        if (seen.has(key)) return null;
        seen.add(key);
        return {
          url: `${SITE}/${type}/${m.id}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.6,
        };
      })
      .filter(Boolean) as MetadataRoute.Sitemap;
  } catch {
    // ignore — static routes are still valid
  }

  return [...staticRoutes, ...dynamicRoutes];
}
