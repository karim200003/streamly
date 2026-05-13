# Streamly

Next.js app for browsing movies and TV (TMDB metadata), watch pages, favorites, history, comments, and admin tools. Auth via [Auth.js](https://authjs.dev) (NextAuth v5) with Prisma + PostgreSQL.

## Requirements

- Node 22+
- PostgreSQL (local: see `docker-compose.yml`)

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (prod) | PostgreSQL connection string |
| `AUTH_SECRET` | Yes (prod) | Secret for session encryption (long random string) |
| `AUTH_URL` | Deploy | Public site URL (e.g. `https://example.com`) |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical URL for metadata, sitemap, robots |
| `TMDB_API_KEY` | Recommended | [TMDB](https://www.themoviedb.org/settings/api) API key; without it the app runs in demo mode |
| `NEXT_PUBLIC_TMDB_IMAGE_BASE` | No | Override TMDB image CDN base |
| `ADMIN_EMAILS` | No | Comma-separated emails promoted to `ADMIN` on login |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | No | Enable Google sign-in when both set |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | No | Distributed rate limits; otherwise in-memory limits |

On **production** startup, `DATABASE_URL` and `AUTH_SECRET` are validated (see `src/lib/env.ts` and `src/instrumentation.ts`).

## Scripts

```bash
npm install
npm run db:up          # Postgres via Docker
npx prisma migrate dev
# Create `.env` with the variables from the table below.
npm run dev
```

Other commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run db:studio`, `npm run db:deploy` (migrations in CI/Docker).

## Docker

The `Dockerfile` runs `prisma migrate deploy` then `next start`. Pass the same env vars at runtime.

## Deploy on Vercel

1. Push this repo to GitHub (see below).
2. In [Vercel](https://vercel.com) → **Add New Project** → import the GitHub repository.
3. **Build & Development Settings** → set **Build Command** to `npm run build:vercel` (applies DB migrations during the build; requires `DATABASE_URL` in Vercel **Environment Variables**).
4. Add the same variables as in the table above for **Production** (and **Preview** if you want previews to work with auth/DB). Minimum for a working app:
   - `DATABASE_URL` — e.g. [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), [Neon](https://neon.tech), or [Supabase](https://supabase.com).
   - `AUTH_SECRET` — e.g. `openssl rand -base64 32`.
   - `AUTH_URL` — your production URL, e.g. `https://your-project.vercel.app` (match the domain Vercel assigns or your custom domain).
   - `NEXT_PUBLIC_SITE_URL` — same canonical URL as `AUTH_URL` for metadata and sitemap.
   - `TMDB_API_KEY` — recommended for real data.
5. Redeploy after changing env vars. For Google OAuth, add the Vercel URL to Google Cloud **Authorized redirect URIs** (`https://<domain>/api/auth/callback/google`).

### Push to GitHub (from your machine)

```bash
git remote add origin https://github.com/<YOUR_USER>/<YOUR_REPO>.git
git push -u origin main
```

Create the empty repo on GitHub first (**Repositories** → **New**), or use GitHub CLI: `gh repo create streaming --private --source=. --remote=origin --push`.

## License / data

Movie and TV metadata © [The Movie Database (TMDB)](https://www.themoviedb.org/). This project is not endorsed by TMDB.
