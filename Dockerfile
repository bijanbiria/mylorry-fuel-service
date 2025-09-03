# ---------- Build stage ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---------- Runtime stage ----------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# only needed runtime deps
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --prod --frozen-lockfile

# copy compiled dist
COPY --from=build /app/dist ./dist

# healthcheck + start
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]