# Multi-stage build for Node.js Engine service
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /build

# Copy dependency files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for TypeScript)
RUN npm install

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# ============================================
# Runtime stage
# ============================================
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user (use existing node user)
# User 'node' already exists with UID 1000 in official node images

# Set working directory
WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled code from builder
COPY --from=builder /build/dist ./dist

# Create sessions directory
# Create sessions directory and ensure it is writable by any user (for volume mounts)
RUN mkdir -p /app/sessions && chown -R node:node /app && chmod 777 /app/sessions

# Switch to non-root user
USER node

# Health check (Redis connection)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "require('ioredis').createClient(process.env.ENGINE_REDIS_HOST).ping()" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run the application
CMD ["node", "dist/main.js"]
