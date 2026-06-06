# Accelyo

> Plateforme de carte etudiante dematerialisee - Version Production
>
> Securite maximale, Plug & Play, zero dependance au SI universitaire.

## Architecture

Monorepo Turborepo compose de:

- **apps/api** - Backend Node.js + Express + Prisma + PostgreSQL
- **apps/dashboard** - Interface admin React + Vite + TypeScript
- **apps/mobile** - Application etudiant React Native (Expo) avec HCE NFC
- **packages/shared** - Types TypeScript partages entre apps
- **packages/crypto** - Utilitaires cryptographiques (AES, JWT, RSA, hash)
- **packages/validators** - Schemas de validation Zod
- **infra/docker** - Docker Compose pour deploiement on-premise
- **infra/nginx** - Configuration reverse proxy production

## Prerequis

- Node.js >= 20 LTS
- npm >= 10
- Docker Desktop (pour la base et le mode on-premise)
- PostgreSQL 16 (si lance hors Docker)
- Redis 7 (si lance hors Docker)

## Installation

```bash
# 1. Installer toutes les dependances du monorepo
npm install

# 2. Copier le fichier d'environnement
cp .env.example .env

# 3. Editer .env et generer toutes les cles
#    JWT_SECRET, ENCRYPTION_KEY, RSA keys, etc.
#    Voir le fichier .env.example pour les commandes openssl

# 4. Demarrer Postgres + Redis + MinIO en local (Docker)
cd infra/docker
docker compose up -d postgres redis minio

# 5. Lancer les migrations Prisma
cd ../../apps/api
npx prisma migrate dev
npx prisma generate

# 6. Demarrer en mode developpement
cd ../..
npm run dev
```

## Workflow developpement local (verifie 2026-04-25)

Stack lancee actuellement:

| Service           | Port  | Container                      |
| ----------------- | ----- | ------------------------------ |
| PostgreSQL 16     | 5435  | accelyo_postgres               |
| Redis 7           | 6380  | accelyo_redis                  |
| MinIO             | 9000  | accelyo_minio                  |
| MinIO console     | 9001  | accelyo_minio                  |
| API Express       | 3001  | host (npx tsx)                 |
| Dashboard Vite    | 5173  | host (npm run dev)             |

### Reprise apres reboot

```bash
# 1. Redemarrer les containers d'infra
docker start accelyo_postgres accelyo_redis accelyo_minio

# 2. Lancer l'API en arriere plan
cd apps/api
npx tsx src/server.ts &

# 3. Lancer le dashboard
cd ../dashboard
npm run dev
```

### Comptes de bootstrap

- Super admin: `admin@accelyo.fr` / `AccelyoAdmin2026!@`
- ATTENTION: changer ce mot de passe a la premiere connexion en environnement reel.

### Reinitialiser le rate limiter en dev

Si vous testez l'auth en boucle et tombez sur "Trop de requetes":

```bash
docker exec accelyo_redis redis-cli FLUSHDB
```

### Verifier le chiffrement applicatif en BDD

```bash
docker exec accelyo_postgres psql -U accelyo_user -d accelyo \
  -c 'SELECT "firstNameEnc", "studentNumberHash" FROM "Student" LIMIT 1;'
```

Les champs *Enc sont au format `iv:tag:ciphertext` hex (AES-256-GCM).

## Modes de deploiement

### Mode Cloud (OVH/Scaleway - souverain France)

Le code est conteneurise. Voir `infra/docker/docker-compose.yml` pour la stack
complete et `infra/scripts/deploy.sh` pour le script de deploiement automatise.

### Mode On-Premise (universite)

Meme stack Docker Compose, deployee directement sur les serveurs de
l'universite. Aucune dependance au SI universitaire requise.

## Securite

Le projet applique le principe **Security by Design**:

- JWT court-vecu + refresh rotatif + blacklist Redis
- AES-256-GCM pour les donnees sensibles en BDD
- RS256 pour signer les cartes NFC
- MFA obligatoire pour tous les comptes admin
- RBAC granulaire par ressource
- Rate limiting Redis-backed par endpoint
- Helmet + CSP + HSTS
- Audit log immuable de toutes les actions admin
- Conformite RGPD (effacement, minimisation, journalisation)

Voir `docs/security/POLICY.md` pour la politique complete.

## Commandes principales

```bash
npm run dev               # Demarre tous les services en dev
npm run build             # Build production de tous les apps
npm run test              # Lance tous les tests
npm run test:coverage     # Tests + couverture (minimum 80%)
npm run lint              # Lint l'ensemble du monorepo
npm run format            # Prettier sur tous les fichiers
```

### Specifique API (apps/api)

```bash
cd apps/api
npm run typecheck         # tsc --noEmit (strict, doit etre a 0 erreur)
npm run build             # Bundle ESM de prod via esbuild -> dist/server.js
npm run test              # Jest en mode ESM (ts-jest)
npm run docs:openapi      # Regenere docs/api/openapi.json depuis la spec
```

Le build de l'API utilise **esbuild** (voir `apps/api/scripts/build.mjs`):
il produit un bundle ESM autonome dans `dist/server.js`, avec les packages
`@accelyo/*` inlines. Toutes les autres dependances npm restent externes
(resolues depuis `node_modules` au runtime). Lancement: `npm start`.

### Documentation API interactive

Une fois l'API demarree, la doc Swagger est servie sur:

- `GET /docs`       - interface Swagger UI interactive
- `GET /docs.json`  - specification OpenAPI brute (28 routes)

La source de verite de la spec est `apps/api/src/docs/openapi.ts`.

## Contraintes absolues du projet

- Zero secret dans le code (toujours via env)
- Toutes les entrees validees avec Zod
- Pas de requetes SQL brutes (Prisma uniquement)
- HTTPS partout, HTTP interdit en production
- Logs structures JSON (pas de console.log en prod)
- Tests obligatoires pour tous les modules securite
- Donnees etudiantes chiffrees AVANT insertion BDD
- Audit log pour toutes les actions admin

## Initialisation Git

Le depot n'est pas encore initialise. Le `.gitignore` est pret et exclut
deja `.env`, `secrets/`, `*.pem`/`*.key`, `node_modules/`, `dist/` et
`coverage/`. Pour creer le depot et le premier commit:

```bash
git init
git add -A
git commit -m "Initial commit - plateforme Accelyo"
```

VERIFICATION: avant de pousser, confirmez qu'aucun secret n'est suivi:

```bash
git ls-files | grep -E "\.env$|secrets/|\.pem$|\.key$"   # doit ne rien renvoyer
```

## Documentation

- `docs/api/` - Documentation OpenAPI/Swagger auto-generee
- `docs/security/` - Politique de securite et procedures
