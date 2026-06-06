#!/usr/bin/env bash
# =================================================================
# Deploiement automatique (cloud + on-premise).
# =================================================================
# Pre-requis sur la machine cible:
#   - Docker + Docker Compose v2
#   - Acces a la registry (docker login)
#   - Variables d'env definies dans /opt/accelyo/.env
#
# Usage: ./infra/scripts/deploy.sh
#
# ATTENTION:
#   - Le script execute les migrations Prisma AVANT de demarrer
#     la nouvelle version pour eviter les desalignements schema/code.
#   - En cas d'echec de migration, on n'avance PAS.
# =================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/docker/docker-compose.yml"

cd "$ROOT_DIR"

echo "[deploy] Pull des images..."
docker compose -f "$COMPOSE_FILE" pull

echo "[deploy] Migrations Prisma..."
docker compose -f "$COMPOSE_FILE" run --rm api npx prisma migrate deploy

echo "[deploy] Demarrage des services..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "[deploy] Healthcheck..."
sleep 5
if ! docker compose -f "$COMPOSE_FILE" ps | grep -q "(healthy)"; then
  echo "[deploy] AVERTISSEMENT: certains services ne sont pas encore healthy."
fi

echo "[deploy] OK."
