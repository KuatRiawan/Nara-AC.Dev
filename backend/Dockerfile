# =========================================================================
#  NARA AC BACKEND — Production Dockerfile
#  Node.js 20 LTS Alpine
# =========================================================================

FROM node:20-alpine AS base

# Install build dependencies if needed
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code and migrations
COPY openapi.yaml ./
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY uploads/ ./uploads/

# Ensure uploads directory has correct permissions
RUN mkdir -p /app/uploads && chmod -R 755 /app/uploads

# Expose backend port
EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

# Health check against /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4000/health || exit 1

# Start backend server
CMD ["node", "src/server.js"]

