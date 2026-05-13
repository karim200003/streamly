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

// Content Security Policy. Loose enough to allow Next, TMDB images,
// inline styles (Tailwind), and the embed iframes — strict everywhere
// else. `unsafe-inline` for style-src is required by Tailwind v4's
// runtime; `'self'` for script-src plus `'unsafe-inline'` is the Next.js
// app-router default. Tighten further (nonces) if you have time.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://image.tmdb.org https://lh3.googleusercontent.com https://i.ytimg.com`,
  `font-src 'self' data:`,
  `connect-src 'self' https://api.themoviedb.org`,
  `frame-src ${EMBED_HOSTS.join(" ")}`,
  `media-src 'self' blob:`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'self'`,
  `upgrade-insecure-requests`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
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
