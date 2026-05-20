# Multi-Stage Build for Optimized Production Container
# Phase 1: Build & Dependency Installation
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for any build steps)
RUN npm ci

# Copy application source code
COPY . .

# Clean prune to keep only production dependencies
RUN npm prune --production

# Phase 2: Lightweight Production Execution
FROM node:20-alpine

# Set node environment to production
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy production dependencies from builder phase
COPY --from=builder /usr/src/app/node_modules ./node_modules
# Copy application source code
COPY --from=builder /usr/src/app ./

# Expose Mera API Gateway's port
EXPOSE 5000

# Start production server
CMD ["node", "server.js"]
