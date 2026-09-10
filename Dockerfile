# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

RUN npm ci --ignore-scripts

# Copy source
COPY tsconfig.base.json ./
COPY routing-rules.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/
COPY packages/client/ ./packages/client/

# Build client
RUN npm run build -w @parcel-routing/client

# Stage 2: Production
FROM node:22-alpine AS production

RUN apk add --no-cache tini
WORKDIR /app

# Non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy only what we need
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/tsconfig.base.json ./
COPY --from=builder /app/routing-rules.json ./
COPY --from=builder /app/packages/shared/ ./packages/shared/
COPY --from=builder /app/packages/server/ ./packages/server/
COPY --from=builder /app/packages/client/dist/ ./packages/client/dist/

# Data directory for SQLite
RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data

USER appuser

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/parcel-routing.db
ENV RULES_PATH=../../routing-rules.json

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Use tini for proper signal handling (PID 1 problem)
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--import", "tsx", "packages/server/src/index.ts"]
