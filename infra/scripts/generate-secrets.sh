#!/usr/bin/env bash
# =================================================================
# Genere les secrets initiaux d'un nouveau deploiement.
# =================================================================
# Cree:
#   - JWT_SECRET / JWT_REFRESH_SECRET / ENCRYPTION_KEY (.env.secrets)
#   - secrets/rsa_private.pem + rsa_public.pem
#
# A executer UNE FOIS au premier deploiement, jamais ensuite.
# La rotation des cles est une procedure manuelle documentee.
# =================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SECRETS_DIR="$ROOT_DIR/secrets"
mkdir -p "$SECRETS_DIR"

if [ -f "$SECRETS_DIR/rsa_private.pem" ]; then
  echo "[generate-secrets] Cles RSA deja presentes - abandon."
  exit 1
fi

echo "[generate-secrets] Generation cles RSA 4096..."
openssl genrsa -out "$SECRETS_DIR/rsa_private.pem" 4096
openssl rsa -in "$SECRETS_DIR/rsa_private.pem" -pubout -out "$SECRETS_DIR/rsa_public.pem"
chmod 600 "$SECRETS_DIR/rsa_private.pem"

echo "[generate-secrets] Generation des secrets symetriques..."
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

cat > "$ROOT_DIR/.env.secrets" <<EOF
# Secrets generes le $(date -Iseconds) - NE PAS COMMITER
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
EOF
chmod 600 "$ROOT_DIR/.env.secrets"

echo "[generate-secrets] Termine."
echo "  -> $SECRETS_DIR/rsa_private.pem (cle privee - NE JAMAIS partager)"
echo "  -> $SECRETS_DIR/rsa_public.pem  (cle publique - a distribuer aux lecteurs)"
echo "  -> $ROOT_DIR/.env.secrets       (a fusionner dans le .env final)"
