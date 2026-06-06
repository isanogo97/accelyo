# Politique de securite Accelyo

## Principes

- **Security by Design** : la securite n'est pas une couche ajoutee.
- **Defense en profondeur** : Helmet + rate limiting + RBAC + chiffrement applicatif.
- **Moindre privilege** : chaque role n'accede qu'au strict necessaire.
- **Souverainete** : hebergement France (OVH/Scaleway) ou on-premise.

## Authentification

- Mots de passe bcrypt (cost 12), jamais stockes en clair.
- JWT access (15 min) + refresh (7 jours) avec rotation.
- MFA TOTP obligatoire sur tous les comptes admin.
- Verrouillage compte apres 5 echecs de login (15 min).

## Chiffrement des donnees

- AES-256-GCM pour les donnees etudiantes (firstName, lastName, studentNumber, email).
- HMAC-SHA-256 pour les hash de recherche (deterministe).
- Cles RSA 4096 pour signer les cartes (RS256).

## Audit

- Toutes les actions admin journalisees (creation, modification, suppression, revocation).
- Logs immuables (pas de route DELETE sur AuditLog).
- Conservation 1 an minimum.

## RGPD

- Minimisation : uniquement les champs strictement necessaires.
- Droit a l'effacement : `DELETE /students/:id/gdpr-delete` (cascade complet).
- Logs anonymises apres 90 jours (sauf AuditLog).

## Rotation des secrets

- Tous les 90 jours pour les secrets symetriques (JWT_SECRET, ENCRYPTION_KEY).
- Procedure documentee dans `docs/security/ROTATION.md` (a creer).
- Cles RSA: rotation = re-emission massive des cartes (operation lourde).

## Reponse a incident

1. Revoquer immediatement les tokens exposes (Redis).
2. Forcer la deconnexion globale si suspicion (vider Redis whitelist).
3. Communiquer a l'universite affectee dans les 72h (RGPD).
4. Conserver les preuves dans le journal d'audit.

## Contraintes absolues

- Pas de secret dans le code (toujours via env).
- Pas de requete SQL brute (Prisma uniquement).
- Pas de eval / Function dynamique.
- Pas de HTTP en production (HTTPS only, HSTS preload).
- Pas de localStorage pour donnees sensibles cote mobile/web.
