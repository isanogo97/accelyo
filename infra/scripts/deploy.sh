#!/usr/bin/env bash
# =================================================================
# Deploiement automatique (cloud + on-premise).
# =================================================================
# Pre-requis sur la machine cible:
#   - Docker + Docker Compose v2
#   - Images accessibles (packages ghcr publics, ou docker login)
#   - Fichier .env a la racine du repo (voir setup-prod-env.sh)
#
# Usage: bash infra/scripts/deploy.sh
# =================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/docker/docker-compose.yml"
ENV_FILE="$ROOT_DIR/.env"

cd "$ROOT_DIR"

# Le .env est a la racine du repo: on le passe explicitement a compose.
COMPOSE="docker compose -f $COMPOSE_FILE --env-file $ENV_FILE"

echo "[deploy] Mise a jour du code (git pull)..."
git pull --ff-only 2>/dev/null || echo "[deploy] (pas de git pull - on continue avec le code local)"

echo "[deploy] Pull des images..."
$COMPOSE pull

echo "[deploy] Migrations Prisma..."
$COMPOSE run --rm --user root api npx prisma migrate deploy --schema apps/api/prisma/schema.prisma

echo "[deploy] Demarrage des services..."
$COMPOSE up -d --remove-orphans

echo "[deploy] Healthcheck..."
sleep 5
if ! $COMPOSE ps | grep -q "(healthy)"; then
  echo "[deploy] AVERTISSEMENT: certains services ne sont pas encore healthy."
fi

echo "[deploy] OK."
