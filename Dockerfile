# syntax=docker/dockerfile:1

# 1) Base image
FROM node:20-alpine AS base
WORKDIR /app

# 2) Install deps for build (workspaces)
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json
RUN npm ci --workspaces

# 3) Build backend
FROM deps AS builder
COPY . .
RUN npm run -w apps/backend prisma:generate \
 && npm run -w apps/backend build

# 4) Production runtime (only backend + prod deps)
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy manifest files and prisma schema first so postinstall can run generate
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/backend/prisma ./apps/backend/prisma

# Install backend deps (inclui dev para executar prisma CLI em runtime)
RUN npm ci --workspace apps/backend \
 && npm run -w apps/backend prisma:generate

# Copy built artifacts
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

EXPOSE 3333

# Run migrations then start
CMD ["npm", "run", "-w", "apps/backend", "start:prod"]
