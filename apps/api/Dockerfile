# =================================================================
# Dockerfile API - Multi-stage build
# =================================================================
# Stage 1 (builder): installe TOUTES les dependances + compile TypeScript
# Stage 2 (runner): image finale minimale, prod-only deps, user non-root
# =================================================================

FROM node:20-alpine AS builder
WORKDIR /app

# Astuce monorepo: on copie d'abord les manifests pour profiter du cache Docker.
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/crypto/package.json packages/crypto/
COPY packages/validators/package.json packages/validators/
COPY apps/api/package.json apps/api/

RUN npm ci

# Puis on copie le code source.
COPY packages/shared packages/shared
COPY packages/crypto packages/crypto
COPY packages/validators packages/validators
COPY apps/api apps/api

WORKDIR /app/apps/api
RUN npx prisma generate
WORKDIR /app
RUN npm run build --workspace=@accelyo/api

# -----------------------------------------------------------------
# Image finale - le moins de surface d'attaque possible.
# -----------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

# Utilisateur non-root - obligatoire en production.
RUN addgroup -S accelyo && adduser -S accelyo -G accelyo

ENV NODE_ENV=production
COPY --from=builder /app/package.json /app/package-lock.json* /app/turbo.json ./
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/prisma apps/api/prisma
COPY --from=builder /app/packages packages
COPY --from=builder /app/node_modules node_modules

USER accelyo

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "apps/api/dist/server.js"]
