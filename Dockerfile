# ------------ 1) Deps (dev + prod) ------------
FROM node:22-alpine AS deps
WORKDIR /app
# Copy only manifests to maximize layer caching
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# ------------ 2) Build (compile TS -> dist) ------------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml* ./
# Copy build-essential config files explicitly
COPY nest-cli.json tsconfig*.json ./
COPY src ./src
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm run build
# Optional verification of build outputs
# RUN ls -la dist && test -f dist/main.js

# ------------ 3) Prod deps only ------------
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate
# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# ------------ 4) Runtime ------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Copy build output and production node_modules
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

EXPOSE 3000
# If you don’t expose a health route, remove or adjust this
# HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
