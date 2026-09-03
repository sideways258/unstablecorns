# syntax=docker/dockerfile:1

# ---------- build stage: compile the React front-end ----------
# react-scripts 4 (webpack 4) is happiest on Node 16; newer Node needs
# --openssl-legacy-provider hacks and still hits edge cases.
FROM node:16 AS build
WORKDIR /app

# Install all deps (the CRA build needs dev deps too).
COPY package.json package-lock.json ./
# Fall back to `npm install` if the old lockfileVersion:1 lock is out of sync.
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Front-end sources.
COPY tsconfig.json ./
COPY src ./src
COPY public ./public

# This is an old CRA codebase; don't let stale lint/TS warnings fail the build.
ENV CI=false
ENV DISABLE_ESLINT_PLUGIN=true
ENV TSC_COMPILE_ON_ERROR=true
RUN npm run build

# ---------- runtime stage ----------
FROM node:18-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8090

# Reuse the dependency tree from the build stage (server.js only needs
# boardgame.io / koa-static / underscore, all present here).
COPY --from=build /app/node_modules ./node_modules
# Pre-compiled game server (CommonJS) + game logic.
COPY server ./server
# Built front-end, served from <__dirname>/../build == /app/build.
COPY --from=build /app/build ./build

EXPOSE 8090

# Hit the SPA root; the server returns build/index.html with a 200.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8090/ || exit 1

CMD ["node", "server/server.js"]
