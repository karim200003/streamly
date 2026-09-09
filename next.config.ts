import type { NextConfig } from "next";
import { PROVIDER_FRAME_HOSTS } from "./src/lib/vidsrc";

// Embed providers we iframe in the player + YouTube for trailers.
// Provider list is sourced from src/lib/vidsrc.ts so adding a new
// source there automatically updates the CSP.
const EMBED_HOSTS = [
  ...PROVIDER_FRAME_HOSTS,
  // Trailer modals can pull from YouTube
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
];

// `'unsafe-inline'` in script-src is required by Next's App Router runtime
// (inline boot script). `'unsafe-eval'` is required by React in DEV ONLY
// (callstack reconstruction / Turbopack HMR) — we include it in dev and
// drop it in prod, where React never uses eval. If you adopt nonce-based
// CSP, replace `'unsafe-inline'` with `'nonce-<value>'` via src/proxy.ts.
// `frame-ancestors 'none'` blocks clickjacking; nothing self-iframes.
const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = isDev
  ? `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
  : `script-src 'self' 'unsafe-inline'`;

const csp = [
  `default-src 'self'`,
  scriptSrc,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://image.tmdb.org https://lh3.googleusercontent.com https://i.ytimg.com`,
  `font-src 'self' data:`,
  `connect-src 'self' https://api.themoviedb.org`,
  `frame-src ${EMBED_HOSTS.join(" ")}`,
  `media-src 'self' blob:`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle in `.next/standalone` that
  // includes only the runtime files actually needed. The Docker image
  // copies this instead of full `node_modules`, cutting the image from
  // ~1GB+ to ~150MB and shrinking cold start.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // Smaller production runtime
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
