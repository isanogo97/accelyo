#!/usr/bin/env bash
# =================================================================
# Mise en place HTTPS (Let's Encrypt) pour Accelyo.
# Usage: bash infra/scripts/setup-tls.sh [domaine] [email]
#   defaut: accelyo.fr  ibrasanogo98@gmail.com
#
# Prerequis: le domaine doit deja pointer (A) vers ce serveur.
# Effet: emet le certificat, bascule les URLs en HTTPS, demarre nginx (TLS),
#        configure le renouvellement automatique (webroot + reload nginx).
# =================================================================
set -euo pipefail

DOMAIN="${1:-accelyo.fr}"
EMAIL="${2:-ibrasanogo98@gmail.com}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE="docker compose -f $ROOT_DIR/infra/docker/docker-compose.yml --env-file $ENV_FILE"

echo "==> 1/6 Installation de certbot"
sudo apt-get update -qq && sudo apt-get install -y certbot

echo "==> 2/6 Preparation du webroot ACME (/var/www/certbot)"
sudo mkdir -p /var/www/certbot

echo "==> 3/6 Liberation du port 80 (arret dashboard/nginx eventuels)"
$COMPOSE stop dashboard nginx 2>/dev/null || true

echo "==> 4/6 Emission du certificat (standalone) pour $DOMAIN + www.$DOMAIN"
sudo certbot certonly --standalone \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --email "$EMAIL" --agree-tos --no-eff-email -n

echo "==> 5/6 Bascule des URLs en HTTPS dans .env"
set_env(){
  if grep -q "^$1=" "$ENV_FILE"; then
    sudo sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"
  else
    echo "$1=$2" | sudo tee -a "$ENV_FILE" >/dev/null
  fi
}
set_env API_BASE_URL   "https://$DOMAIN"
set_env DASHBOARD_URL  "https://$DOMAIN"
set_env CORS_ORIGINS   "https://$DOMAIN,https://www.$DOMAIN"
set_env DASHBOARD_PORT "127.0.0.1:8080"   # localhost only: nginx y accede en interne, pas d'expo publique

echo "==> 6/6 Demarrage de la stack avec le reverse proxy TLS"
$COMPOSE --profile tls up -d --remove-orphans

echo "==> Bascule du renouvellement en mode webroot (nginx reste en service)"
sudo certbot certonly --webroot -w /var/www/certbot \
  -d "$DOMAIN" -d "www.$DOMAIN" --keep-until-expiring -n \
  --deploy-hook "$COMPOSE exec -T nginx nginx -s reload"

echo
echo "=================================================================="
echo " HTTPS pret. Teste :"
echo "   - Dashboard : https://$DOMAIN"
echo "   - API       : bash infra/scripts/smoke-test.sh https://$DOMAIN admin@accelyo.fr '<mot_de_passe>'"
echo " Le renouvellement auto est gere par le timer systemd de certbot."
echo "=================================================================="
