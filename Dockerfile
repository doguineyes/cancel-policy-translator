# Dockerfile (dev/prod-capable)
FROM node:22-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copy source
COPY . .
# Copy the rules (non-TS assets are NOT emitted by tsc)
COPY service/rules ./rules

# Build TS → JS
RUN npx tsc --project tsconfig.json

EXPOSE 3000
CMD ["node", "dist/server.js"]
