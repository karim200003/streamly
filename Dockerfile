# syntax=docker/dockerfile:1.7

# ---- deps: install with dev deps so we can run prisma generate + next build
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- builder: emit Next standalone output
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npx prisma generate
RUN npm run build

# ---- runner: copy only the standalone bundle + static + public
# Standalone includes the trimmed `node_modules` Next actually needs at
# runtime, so we don't have to copy the full tree. Image shrinks from
# ~1GB+ to ~150MB and cold start drops accordingly.
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat tini
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -G nodejs -u 1001 nextjs

# Standalone server.js + the trimmed node_modules it needs.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets (CSS chunks, fonts, etc.) are served from .next/static.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Public assets (favicons, SW, manifest).
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Prisma engine binaries + schema + migrations for `migrate deploy`.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000

# Migrations run on container start. For multi-replica deploys, move
# this to a release-phase job (k8s Job, Fly release_command, etc.) to
# avoid races between concurrently starting replicas.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
