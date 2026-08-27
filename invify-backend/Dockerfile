# Base stage
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Dependencies stage
FROM base AS deps
RUN npm ci --omit=dev

# Build stage
FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build
# Fail the image build if the known entrypoint is missing
RUN test -f dist/app.js

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3004
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

USER nestjs
EXPOSE 3004

# Verified entrypoint: package.json "start" → node dist/app.js (dist/main.js does not exist)
CMD ["node", "dist/app.js"]

# Liveness-style check: process responds (does not require DB).
# Uses Node (always present) — alpine runner image does not ship wget/curl by default.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3004/livez').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
