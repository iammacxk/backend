# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend/ .
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Copy assets folder if it exists (for ServeStaticModule)
# Glob pattern ensures no error if assets/ doesn't exist
COPY --from=builder /app/asset[s] ./assets

EXPOSE 3001
CMD ["node", "dist/main"]
