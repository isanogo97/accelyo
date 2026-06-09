#!/usr/bin/env bash
# =================================================================
# Sauvegarde Accelyo: dump PostgreSQL + archive du volume MinIO.
# Rotation: conserve les 14 sauvegardes les plus recentes.
# Usage: bash infra/scripts/backup.sh
# Cron quotidien (3h): voir les instructions en fin de fichier.
# =================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE="docker compose -f $ROOT_DIR/infra/docker/docker-compose.yml --env-file $ROOT_DIR/.env"
BACKUP_DIR="$ROOT_DIR/backups"
TS="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "==> Dump PostgreSQL"
$COMPOSE exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "$BACKUP_DIR/db_$TS.sql.gz"

echo "==> Archive du volume MinIO"
VOL="$(docker volume ls -q | grep -E 'minio_data$' | head -1 || true)"
if [ -n "$VOL" ]; then
  docker run --rm -v "$VOL":/data:ro -v "$BACKUP_DIR":/backup alpine \
    tar czf "/backup/minio_$TS.tar.gz" -C /data . 2>/dev/null || echo "(MinIO vide ou indisponible)"
else
  echo "(volume MinIO introuvable, ignore)"
fi

echo "==> Rotation (garde les 14 plus recents de chaque type)"
ls -1t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null    | tail -n +15 | xargs -r rm -f
ls -1t "$BACKUP_DIR"/minio_*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "==> Termine. Contenu de $BACKUP_DIR :"
ls -lh "$BACKUP_DIR" | tail -n +1

# -----------------------------------------------------------------
# Cron quotidien a 3h (a installer une fois):
#   (crontab -l 2>/dev/null; echo "0 3 * * * cd /opt/accelyo && bash infra/scripts/backup.sh >> /opt/accelyo/backups/backup.log 2>&1") | crontab -
# -----------------------------------------------------------------
