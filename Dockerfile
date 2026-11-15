# Shakeslip: one container serves the API and the built website. Build from the v5 folder.
FROM oven/bun:1 AS web
WORKDIR /app/web
COPY web/package.json web/bun.lock ./
RUN bun install --frozen-lockfile
COPY web/ ./
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID
RUN bun run build

FROM oven/bun:1
RUN apt-get update && apt-get install -y --no-install-recommends chromium fonts-noto fonts-noto-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package.json server/bun.lock ./
RUN bun install --frozen-lockfile --production
COPY server/ ./
COPY --from=web /app/web/dist /app/web/dist
ENV NODE_ENV=production PORT=8080 DB_PATH=/data/shakeslip.db WEB_DIST=/app/web/dist PDF_BROWSER=/usr/bin/chromium
EXPOSE 8080
CMD ["bun", "src/index.ts"]
