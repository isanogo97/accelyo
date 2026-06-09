#!/usr/bin/env bash
# =================================================================
# Change le mot de passe d'un utilisateur directement en base.
# Usage: bash infra/scripts/set-admin-password.sh [email]
#   email par defaut: admin@accelyo.fr
#
# Le mot de passe est saisi en aveugle (jamais affiche, jamais en
# historique). Hash bcrypt 12 rounds (identique a l'application).
# A utiliser tant que l'ecran "changer mot de passe" n'existe pas.
# =================================================================
set -euo pipefail

EMAIL="${1:-admin@accelyo.fr}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE="docker compose -f $ROOT_DIR/infra/docker/docker-compose.yml --env-file $ROOT_DIR/.env"

read -rsp "Nouveau mot de passe pour $EMAIL (min 12 caracteres): " PW1; echo
read -rsp "Confirme le mot de passe: " PW2; echo
if [ "$PW1" != "$PW2" ]; then echo "Les mots de passe ne correspondent pas."; exit 1; fi
if [ "${#PW1}" -lt 12 ]; then echo "Trop court (minimum 12 caracteres)."; exit 1; fi

printf '%s' "$PW1" | $COMPOSE exec -T -e ADMIN_EMAIL="$EMAIL" api \
  node --input-type=commonjs -e '
    const bcrypt = require("bcrypt");
    const { PrismaClient } = require("@prisma/client");
    let data = "";
    process.stdin.on("data", c => data += c);
    process.stdin.on("end", async () => {
      const pw = data;
      if (pw.length < 12) { console.error("Mot de passe trop court."); process.exit(1); }
      const prisma = new PrismaClient();
      try {
        const hash = await bcrypt.hash(pw, 12);
        const u = await prisma.user.update({
          where: { email: process.env.ADMIN_EMAIL },
          data: { passwordHash: hash },
        });
        console.log("OK - mot de passe mis a jour pour " + u.email);
        process.exit(0);
      } catch (e) {
        console.error("Echec:", e.message);
        process.exit(1);
      }
    });
  '
