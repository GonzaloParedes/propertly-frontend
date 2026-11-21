# syntax=docker/dockerfile:1
# Next.js 16 / React 19 production image (deps -> build -> runtime).

# --- deps: resolve node_modules in isolation for layer caching ---------------
# Debian (glibc), not alpine (musl): Next 16 builds with Turbopack, whose native
# binary mishandles `next/font/google` under musl (the build fails resolving
# `@vercel/turbopack-next/internal/font/google/font`). glibc builds cleanly.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build: compile the Next app --------------------------------------------
FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* is inlined at build time and runs in the browser, so it must be
# the backend URL reachable from the host (passed by docker-compose).
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runner: serve the built app (next start) --------------------------------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "run", "start"]
