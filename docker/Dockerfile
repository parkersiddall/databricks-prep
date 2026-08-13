# syntax=docker/dockerfile:1

# Multi-stage build with two entry points:
#   --target dev     hot-reloading dev server, used by compose.yaml
#   --target runner  minimal production image, used by compose.prod.yaml
#
# The build context is ../next-app, not this directory, so all COPY paths below
# are relative to the app root. See the compose files.
#
# Node 24 matches the version this project is developed against.

ARG NODE_VERSION=24-alpine

# ---------------------------------------------------------------------------
# base — shared settings
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------------------
# deps — install once, reuse in dev and builder
# ---------------------------------------------------------------------------
FROM base AS deps

# Copy only the manifests first so this layer caches until dependencies
# actually change, not on every source edit.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ---------------------------------------------------------------------------
# dev — hot reloading, source comes from a bind mount at runtime
# ---------------------------------------------------------------------------
FROM base AS dev
ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
# `next dev` already binds 0.0.0.0 by default, so it is reachable from the host.
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
# builder — produce the standalone output
# ---------------------------------------------------------------------------
FROM base AS builder
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ---------------------------------------------------------------------------
# runner — production image (no npm, no source, no full node_modules)
# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
# Docker sets HOSTNAME to the container ID by default, which the standalone
# server would try to bind to and fail. Pin it explicitly.
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# standalone's server.js serves these two directories but does not copy them.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
