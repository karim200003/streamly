import type { MediaType } from "./tmdb-shared";

/**
 * Streaming provider registry.
 *
 * URL specs and parameters for each provider were taken from their
 * official docs / live player bundles (verified 2026-09-09):
 *
 *   Videasy   — https://www.videasy.net/docs   (player.videasy.to)
 *   VidKing   — https://vidking.net/docs       (www.vidking.net/embed/...)
 *   VidFast   — https://vidfast.pro/           (vidfast.vc/movie|tv)
 *   VidZee    — https://vidzee.wtf/docs        (player.vidzee.wtf/embed/...)
 *
 * NOTE: several providers 301 to a new TLD. A cross-origin redirect is
 * re-checked against `frame-src`, so the REDIRECT TARGET must be in the
 * CSP or the browser blocks the frame — a `curl -L` health check passes
 * while the embed is dead in-app. Build URLs on the post-redirect host
 * and keep the legacy origin allowed in case they flip back.
 *
 * Order is the source-button order in the UI. Videasy stays default.
 */

// Brand accent — passed to providers that accept theming. Hex w/o '#'.
const ACCENT_HEX = "ef4444";

export interface StreamServer {
  id: string;
  name: string;
  url: string;
  /** Whether the provider supports postMessage progress events. */
  supportsProgress?: boolean;
}

export interface ServerOptions {
  /** Resume time in seconds. Currently honored by Videasy and VidKing. */
  startTime?: number;
  /** Default subtitle language (ISO 639-1, e.g. "en"). */
  dsLang?: string;
}

type Builder = (
  type: MediaType,
  tmdbId: number,
  season: number,
  episode: number,
  opts: ServerOptions,
) => string;

interface Provider {
  id: string;
  name: string;
  build: Builder;
  /** Whether this provider posts progress events to the parent window. */
  supportsProgress?: boolean;
}

// ---------- helpers ----------

function qs(params: Record<string, string | number | boolean | undefined>) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "" && v !== false,
  );
  if (entries.length === 0) return "";
  return (
    "?" +
    entries
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join("&")
  );
}

// ---------- providers ----------

const PROVIDERS: Provider[] = [
  {
    // Default. Modern player, supports color theming, episode selector,
    // auto-next, Netflix-style overlay, and posts progress events.
    id: "videasy",
    name: "Videasy",
    supportsProgress: true,
    build: (type, id, s, e, opts) => {
      const path =
        type === "movie"
          ? `/movie/${id}`
          : `/tv/${id}/${s}/${e}`;
      const params: Record<string, string | number | boolean | undefined> = {
        color: ACCENT_HEX,
        overlay: true,
      };
      if (type === "tv") {
        params.nextEpisode = true;
        params.episodeSelector = true;
        params.autoplayNextEpisode = true;
      }
      if (opts.startTime && opts.startTime > 0) {
        params.progress = Math.floor(opts.startTime);
      }
      return `https://player.videasy.to${path}${qs(params)}`;
    },
  },

  {
    // Customizable themed player. Used by cineby.sc (independent
    // signal of reliability). Supports color, autoPlay, nextEpisode,
    // episodeSelector, and (per their docs) progress events.
    id: "vidking",
    name: "VidKing",
    supportsProgress: true,
    build: (type, id, s, e, opts) => {
      const path =
        type === "movie"
          ? `/embed/movie/${id}`
          : `/embed/tv/${id}/${s}/${e}`;
      const params: Record<string, string | number | boolean | undefined> = {
        color: ACCENT_HEX,
        autoPlay: true,
      };
      if (type === "tv") {
        params.nextEpisode = true;
        params.episodeSelector = true;
      }
      if (opts.startTime && opts.startTime > 0) {
        params.progress = Math.floor(opts.startTime);
      }
      return `https://www.vidking.net${path}${qs(params)}`;
    },
  },

  {
    // Modern player with theme=<HEX> (no leading #), autoPlay,
    // and on TV: autoNext + nextButton.
    id: "vidfast",
    name: "VidFast",
    build: (type, id, s, e) => {
      const path =
        type === "movie"
          ? `/movie/${id}`
          : `/tv/${id}/${s}/${e}`;
      const params: Record<string, string | number | boolean | undefined> = {
        theme: ACCENT_HEX,
        autoPlay: true,
      };
      if (type === "tv") {
        params.autoNext = true;
        params.nextButton = true;
      }
      return `https://vidfast.vc${path}${qs(params)}`;
    },
  },

  {
    // Lightweight player; explicitly sets `frame-ancestors *` so it
    // never blocks our iframe. It also sends `X-Frame-Options:
    // SAMEORIGIN`, but CSP Level 2 says frame-ancestors overrides XFO
    // and every current browser honours that, so the embed still loads.
    // NOTE: the `/v2/embed/...` prefix was retired upstream and now
    // 404s — the live path is plain `/embed/...`.
    id: "vidzee",
    name: "VidZee",
    build: (type, id, s, e, opts) => {
      const path =
        type === "movie"
          ? `/embed/movie/${id}`
          : `/embed/tv/${id}/${s}/${e}`;
      const params: Record<string, string | number | boolean | undefined> = {
        autoplay: true,
        lang: opts.dsLang,
      };
      return `https://player.vidzee.wtf${path}${qs(params)}`;
    },
  },
];

// Hosts that need to appear in `frame-src` of the CSP. Exported so
// next.config.ts can build its CSP from a single source of truth.
export const PROVIDER_FRAME_HOSTS = [
  // Current build hosts, plus the legacy origins they redirect from.
  "https://player.videasy.to",
  "https://player.videasy.net",
  "https://www.vidking.net",
  "https://vidfast.vc",
  "https://vidfast.pro",
  "https://player.vidzee.wtf",
] as const;

export function getServers(
  type: MediaType,
  tmdbId: number,
  season?: number,
  episode?: number,
  opts: ServerOptions = {},
): StreamServer[] {
  const s = season ?? 1;
  const e = episode ?? 1;
  return PROVIDERS.map((p) => ({
    id: p.id,
    name: p.name,
    url: p.build(type, tmdbId, s, e, opts),
    supportsProgress: p.supportsProgress,
  }));
}
