#!/usr/bin/env bash
# =================================================================
# Genere le fichier .env de production (a la racine du repo).
# Usage: bash infra/scripts/setup-prod-env.sh <IP_PUBLIQUE>
# - Genere les cles RSA + secrets symetriques si absents (.env.secrets)
# - Tire des mots de passe forts pour Postgres / Redis / MinIO
# - Ecrit un .env complet pret pour docker compose
# =================================================================
set -euo pipefail

IP="${1:?Usage: bash infra/scripts/setup-prod-env.sh <IP_PUBLIQUE>}"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

# 1) Secrets applicatifs (RSA + JWT/ENCRYPTION) si pas deja generes.
if [ ! -f .env.secrets ]; then
  bash infra/scripts/generate-secrets.sh
fi

JWT_SECRET=$(grep '^JWT_SECRET=' .env.secrets | cut -d= -f2)
JWT_REFRESH_SECRET=$(grep '^JWT_REFRESH_SECRET=' .env.secrets | cut -d= -f2)
ENCRYPTION_KEY=$(grep '^ENCRYPTION_KEY=' .env.secrets | cut -d= -f2)

# 2) Mots de passe d'infra (forts, aleatoires).
DB_PASS=$(openssl rand -hex 24)
REDIS_PASS=$(openssl rand -hex 24)
MINIO_PASS=$(openssl rand -hex 24)

# 3) Ecriture du .env.
cat > .env <<ENVEOF
API_IMAGE=ghcr.io/isanogo97/accelyo-api:latest
DASHBOARD_IMAGE=ghcr.io/isanogo97/accelyo-dashboard:latest
DEPLOYMENT_MODE=cloud
API_BASE_URL=http://${IP}:3000
DASHBOARD_URL=http://${IP}
CORS_ORIGINS=http://${IP}
DASHBOARD_PORT=80
DB_USER=accelyo_user
DB_PASSWORD=${DB_PASS}
DB_NAME=accelyo
DATABASE_URL=postgresql://accelyo_user:${DB_PASS}@postgres:5432/accelyo
REDIS_PASSWORD=${REDIS_PASS}
REDIS_URL=redis://:${REDIS_PASS}@redis:6379
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
MINIO_USER=accelyo_minio
MINIO_PASSWORD=${MINIO_PASS}
MINIO_BUCKET=accelyo-media
IZLY_MODE=deeplink
ENVEOF
chmod 600 .env

echo "=== .env genere (verification) ==="
if grep -q '^JWT_SECRET=.\+' .env && grep -q '^ENCRYPTION_KEY=.\+' .env; then
  echo "OK: secrets presents."
else
  echo "ERREUR: secrets vides - verifier .env.secrets" >&2
  exit 1
fi
grep -E '^(API_BASE_URL|DATABASE_URL|DASHBOARD_URL)=' .env
