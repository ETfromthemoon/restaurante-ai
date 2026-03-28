# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# SQLite native dependencies
RUN apk add --no-cache sqlite

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Persistent data & logs directories
RUN mkdir -p /data /app/logs

ENV NODE_ENV=production
ENV DB_PATH=/data/restaurante.db

EXPOSE 3000

CMD ["node", "dist/index.js"]
