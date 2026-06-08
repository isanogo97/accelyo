# =================================================================
# Dockerfile API - Multi-stage build
# =================================================================
# Stage 1 (builder): installe TOUTES les dependances + compile TypeScript
# Stage 2 (runner): image finale minimale, prod-only deps, user non-root
# =================================================================

FROM node:20-alpine AS builder
WORKDIR /app

# openssl: requis par Prisma sur Alpine (generation/chargement du moteur).
# python3/make/g++: chaine de build native pour que `npm ci` puisse compiler
# bcrypt depuis les sources si le binaire pre-compile n'est pas telechargeable
# (ex. 504 du CDN GitHub Releases) - rend le build deterministe et resilient.
RUN apk add --no-cache openssl python3 make g++

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

# openssl requis au runtime par le moteur de requete Prisma.
RUN apk add --no-cache openssl

# Utilisateur non-root - obligatoire en production.
# On reutilise l'utilisateur "node" (uid 1000) fourni par l'image officielle:
# les secrets Docker (cle RSA privee) sont montes en uid 1000, donc l'API peut
# lire la cle en mode 600 sans la rendre lisible par tous (chmod 644).
ENV NODE_ENV=production
COPY --from=builder /app/package.json /app/package-lock.json* /app/turbo.json ./
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/prisma apps/api/prisma
COPY --from=builder /app/packages packages
COPY --from=builder /app/node_modules node_modules

USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "apps/api/dist/server.js"]
