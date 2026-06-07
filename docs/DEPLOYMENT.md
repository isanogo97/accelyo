# Déploiement Accelyo — Serveur de production

Guide pas-à-pas pour déployer Accelyo sur un VPS, par adresse IP (sans domaine),
avec déploiement automatique sur tag via GitHub Actions.

Les images Docker (`api`, `dashboard`) sont construites par la CI et publiées sur
GitHub Container Registry (`ghcr.io`) à chaque tag `v*`.

---

## 1. Provisionner un VPS

Recommandation : **Hetzner CX22** (~4 €/mois) ou **Scaleway DEV1-S**, en
**Ubuntu 24.04**, 2 vCPU / 4 Go RAM minimum (Postgres + Redis + MinIO + 2 apps).

Ouvrir au pare-feu (entrant) : `22` (SSH), `80` (dashboard), `3000` (API mobile/lecteurs).

Noter l'**IP publique** du serveur (notée `<IP_SERVEUR>` ci-dessous).

## 2. Installer Docker

```bash
ssh root@<IP_SERVEUR>
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version
```

## 3. Rendre les images ghcr accessibles

Le plus simple : rendre les packages **publics** une fois (pas de login serveur).
Sur GitHub → ton profil → **Packages** → `accelyo-api` → *Package settings* →
*Change visibility* → **Public**. Idem pour `accelyo-dashboard`.

> Alternative (garder privé) : sur le serveur,
> `echo <PAT_read:packages> | docker login ghcr.io -u isanogo97 --password-stdin`

## 4. Récupérer le code + générer les secrets

```bash
mkdir -p /opt && cd /opt
git clone https://github.com/isanogo97/accelyo.git
cd accelyo

# Cles RSA (signature des cartes) + secrets symetriques -> .env.secrets
bash infra/scripts/generate-secrets.sh
cat .env.secrets   # JWT_SECRET / JWT_REFRESH_SECRET / ENCRYPTION_KEY
```

## 5. Créer le fichier `.env`

```bash
cp infra/.env.production.example .env
nano .env
```

À remplir :
- `<IP_SERVEUR>` dans `API_BASE_URL`, `DASHBOARD_URL`, `CORS_ORIGINS`.
- Mots de passe `DB_PASSWORD`, `REDIS_PASSWORD`, `MINIO_PASSWORD` (et reporter
  le `DB_PASSWORD` dans `DATABASE_URL`, le `REDIS_PASSWORD` dans `REDIS_URL`).
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` : coller depuis `.env.secrets`.

## 6. Premier déploiement

```bash
cd /opt/accelyo
bash infra/scripts/deploy.sh
```

Le script : `git pull` → `docker compose pull` → migrations Prisma → `up -d` → healthcheck.

## 7. Vérifier

```bash
curl http://localhost:3000/health        # {"status":"ok",...}
docker compose -f infra/docker/docker-compose.yml ps
```

- API : `http://<IP_SERVEUR>:3000` (doc : `/docs`)
- Dashboard : `http://<IP_SERVEUR>`

### Créer le 1er super-admin

```bash
SEED_ADMIN_EMAIL=admin@accelyo.fr SEED_ADMIN_PASSWORD='ChoisisUnMotDePasseFort1!' \
  docker compose -f infra/docker/docker-compose.yml run --rm api npx prisma db seed
```

## 8. Déploiement automatique (GitHub Actions → SSH)

Le workflow `deploy.yml` construit/pousse les images sur chaque tag `v*`, puis
déclenche un déploiement SSH **si** activé.

1. **Clé SSH dédiée au CI** (sur ta machine) :
   ```bash
   ssh-keygen -t ed25519 -f accelyo_deploy -N ""
   ```
   Ajouter la **clé publique** au serveur :
   ```bash
   ssh-copy-id -i accelyo_deploy.pub root@<IP_SERVEUR>
   # (ou copier accelyo_deploy.pub dans /root/.ssh/authorized_keys)
   ```

2. Sur GitHub → repo → **Settings → Secrets and variables → Actions** :
   - **Secrets** :
     - `PROD_HOST` = `<IP_SERVEUR>`
     - `PROD_USER` = `root` (ou ton user)
     - `PROD_SSH_KEY` = contenu de la **clé privée** `accelyo_deploy`
   - **Variables** :
     - `PROD_DEPLOY_ENABLED` = `true`

3. Déclencher :
   ```bash
   git tag v1.0.1 && git push origin v1.0.1
   ```
   → images publiées + `deploy.sh` exécuté sur le serveur automatiquement.

## 9. Plus tard : domaine + HTTPS

Quand un domaine pointera vers le serveur (A record vers `<IP_SERVEUR>`) :
1. Obtenir des certificats (certbot) dans `infra/nginx/ssl/` (`cert.pem`, `key.pem`).
2. Adapter `server_name` dans `infra/nginx/nginx.conf`.
3. Démarrer le reverse proxy TLS : `docker compose --profile tls up -d nginx`.
4. Mettre `API_BASE_URL`/`DASHBOARD_URL`/`CORS_ORIGINS` en `https://...` et redéployer.

## Exploitation

- Logs : `docker compose -f infra/docker/docker-compose.yml logs -f api`
- Sauvegarde Postgres :
  ```bash
  docker compose -f infra/docker/docker-compose.yml exec postgres \
    pg_dump -U accelyo_user accelyo > backup_$(date +%F).sql
  ```
- Les volumes `postgres_data`, `redis_data`, `minio_data` sont persistants — à inclure dans les sauvegardes.
