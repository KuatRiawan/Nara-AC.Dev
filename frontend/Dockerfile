# =========================================================================
#  NARA AC FRONTEND — Production Multi-Stage Dockerfile
# =========================================================================

# Stage 1: Build Vite React App
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build production assets into dist/
RUN npm run build

# Stage 2: Serve via Nginx Alpine with SSL support
FROM nginx:alpine

# Install openssl for fallback cert generation
RUN apk add --no-cache openssl

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
