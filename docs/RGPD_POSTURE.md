# Accelyo — Note de posture RGPD / protection des données

> **Avertissement** : document d'information, destiné aux échanges commerciaux et aux questionnaires
> sécurité/DPO. Il décrit la posture technique et organisationnelle d'Accelyo. Il **ne constitue pas un
> avis juridique** et doit être validé par un conseil. Dernière mise à jour : 2026-06.

## 1. Rôles
- **Établissement client = responsable de traitement.** Il décide des finalités (émettre une carte
  étudiante dématérialisée, gérer l'accès), détermine la base légale, informe les personnes.
- **Accelyo = sous-traitant** (article 28 RGPD). Accelyo traite les données **uniquement sur instruction
  documentée** du client, via un **contrat de sous-traitance (DPA)** — voir `MODELE_DPA_SOUS-TRAITANCE.md`.

## 2. Données traitées
| Catégorie | Exemples | Sensibilité |
|---|---|---|
| Identité étudiant | nom, prénom, n° étudiant, e-mail, filière, année | Donnée personnelle ordinaire |
| **Photo** d'identité (sur la carte) | photo fournie à l'inscription | Donnée personnelle ordinaire **tant qu'il n'y a pas de reconnaissance faciale** (pas de catégorie « biométrique » art. 9) |
| Carte | `card_uid`, carte signée (JWT), statut, expiration | Donnée personnelle |
| UID carte physique (migration) | numéro de série de l'ancienne carte | Donnée personnelle |
| Préférence | consentement bons plans (marketing) | Donnée personnelle |
| Comptes admin | e-mail, mot de passe (haché), secret MFA (chiffré) | Donnée personnelle |
| Journaux | audit (qui a fait quoi), IP de connexion | Donnée personnelle |

**Pas de données de catégorie spéciale** (santé, opinions, biométrie au sens art. 9) — sauf si le client
active une finalité non prévue. **Pas de mineurs** présumés côté enseignement supérieur (à vérifier si
cible < 16 ans : base légale renforcée).

## 3. Mesures de sécurité techniques (article 32) — en place
- **Chiffrement au repos des données sensibles** : nom, prénom, n° étudiant, e-mail chiffrés en
  **AES-256-GCM** au niveau applicatif (champs `*Enc`) ; recherche via HMAC-SHA-256 déterministe (pas de
  données en clair pour l'indexation).
- **Mots de passe** : hachage **bcrypt** (12 tours). **MFA** (TOTP) disponible, secret chiffré.
- **Carte** : signature **RSA** (clé privée serveur, vérifiable hors-ligne par clé publique) + **HMAC**
  anti-rejeu.
- **Photos** : stockées en object storage (MinIO), accessibles **uniquement via URL présignée de courte
  durée (≈5 min), authentifiée**. Jamais publiques, jamais transmises à un wallet tiers.
- **Cloisonnement multi-locataire** : un admin ne voit **que** les étudiants de son établissement
  (contrôle `requireSameUniversity`). Minimisation d'accès par conception.
- **Transport** : HTTPS/TLS (certificat Let's Encrypt, renouvellement automatique).
- **Réseau** : pare-feu (ports 22/80/443 uniquement), API non exposée en clair.
- **Limitation de débit** (anti-bruteforce / anti-abus), **journal d'audit** des actions sensibles.
- **Sauvegardes** chiffrées quotidiennes (base + object storage), rotation.
- **Révocation immédiate** d'une carte / suspension d'un étudiant (coupe l'accès partout, y compris wallet).

## 4. Localisation & transferts
- **Hébergement en France (OVH)** → données dans l'**EEE**. Pas de transfert hors UE par défaut.
- **Wallets (Google/Apple)** : activés **uniquement si l'étudiant clique lui-même** (opt-in). Seules des
  données minimales d'affichage de la carte transitent alors vers le wallet choisi ; **la photo n'y est
  jamais envoyée**. À déclarer comme traitement distinct / transfert le cas échéant.

## 5. Sous-traitants ultérieurs (à tenir à jour dans le DPA)
| Sous-traitant | Rôle | Localisation |
|---|---|---|
| OVH | hébergement (VPS, sauvegardes) | France |
| OVH (Zimbra) | envoi d'e-mails transactionnels (activation, confirmation) | France |
| Google Wallet | passe carte (si opt-in étudiant) | UE/hors-UE selon Google |
| Apple Wallet | passe carte (si opt-in étudiant) | UE/hors-UE selon Apple |

## 6. Conservation & minimisation
- Données conservées le temps de la **relation** (scolarité) + durée légale éventuelle, puis **supprimées**.
- Fonction de **suppression RGPD** d'un étudiant disponible (effacement des données + photo).
- Finalité limitée : la photo sert à la carte/identification, pas à d'autres usages.

## 7. Droits des personnes
- Accès, rectification, effacement, limitation, opposition : exercés **auprès de l'établissement**
  (responsable) ; Accelyo **assiste** techniquement (export, suppression).
- Consentement marketing (bons plans) **distinct** et révocable (toggle dans l'app).

## 8. Violations de données
- Procédure de détection + **notification au responsable sans délai injustifié** (objectif < 48 h), pour
  lui permettre de notifier la CNIL sous 72 h si requis. Détaillé dans le DPA.

## 9. Ce qu'il reste à formaliser (organisationnel)
- [ ] **DPA** signé avec chaque établissement (modèle fourni).
- [ ] **Politique de confidentialité** publiée (site) + mention d'information à fournir aux étudiants.
- [ ] **Registre des traitements** (côté Accelyo en tant que sous-traitant — art. 30.2).
- [ ] Éventuelle **AIPD/DPIA** si le client la juge nécessaire (Accelyo fournit les éléments techniques).
- [ ] Clause/annexe **sous-traitants** tenue à jour.
