# ============================================
# DEVELOPMENT STAGE
# ============================================
FROM node:20-alpine AS development

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.14.0 --activate

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY turbo.json ./

# Copy all packages
COPY packages ./packages
COPY apps/demo ./apps/demo

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
WORKDIR /app/apps/demo
RUN npx prisma generate

# Expose ports
EXPOSE 3001 50051

# Start development server
CMD ["pnpm", "dev"]

# ============================================
# BUILDER STAGE
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.14.0 --activate

COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY turbo.json ./
COPY tsconfig.json ./

COPY packages ./packages
COPY apps/demo ./apps/demo

RUN pnpm install --frozen-lockfile

# Build all packages
RUN pnpm run build

# ============================================
# PRODUCTION STAGE
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.14.0 --activate

# Install production dependencies only
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./

COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/demo/package.json ./apps/demo/

# Install only production deps
RUN pnpm install --prod --frozen-lockfile

# Copy built files
COPY --from=builder /app/apps/demo/dist ./apps/demo/dist
COPY --from=builder /app/packages/*/dist ./packages/

# Copy Prisma schema and migrations
COPY --from=builder /app/apps/demo/prisma ./apps/demo/prisma

WORKDIR /app/apps/demo

# Generate Prisma client
RUN npx prisma generate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3001 50051

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:3001/health || exit 1

# Start production server
CMD ["node", "dist/server.js"]