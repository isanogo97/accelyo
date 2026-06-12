# Checklist de vérification / tests Accelyo

> Liste vivante de tout ce qui reste à tester/vérifier. Mise à jour au fil des features.

## A. Espace étudiant web — accelyo.fr/carte (v1.1.5 → v1.3.0, déployé)
- [ ] Activation via lien e-mail → définir mot de passe (≥12) → carte activée
- [ ] E-mail de confirmation reçu après activation (lien vers /carte)
- [ ] Connexion e-mail + mot de passe sur /carte
- [ ] Pas d'erreur « trop de requête » en usage normal
- [ ] Onglet **Carte** : carte réaliste (fond/logo/couleur établissement), statut, expiration
- [ ] Bouton **Google Wallet** → ajoute le passe (habillé : couleur + logo)
- [ ] Bouton **Apple Wallet** → message « bientôt » tant que cert absent (comportement attendu)
- [ ] Onglet **Planning** : cours de démo groupés par jour
- [ ] Onglet **Infos** : annonces (épinglées en tête)
- [ ] Onglet **Biblio** : visible seulement si secteur = Bibliothèque ; prêts + bouton Prolonger
- [ ] Onglet **Bons plans** : deals, copie de code, lien
- [ ] Onglet **Profil** : infos, toggle consentement RGPD, déconnexion
- [ ] PWA : « Ajouter à l'écran d'accueil » → plein écran
- [ ] Responsive mobile OK

## B. Design de carte par établissement (v1.3.0, déployé)
- [ ] Dashboard → fiche établissement → « Design de la carte » : upload **logo** (aperçu)
- [ ] Upload **visuel de fond** (aperçu carte combiné)
- [ ] Édition couleur de marque + couleur de texte
- [ ] La carte in-app prend fond/logo/couleur de l'établissement
- [ ] Le passe Google Wallet prend la couleur + logo (plus le rectangle bleu)

## C. Photo étudiant (en cours)
- [ ] Upload photo : self-service (app) + admin (dashboard)
- [ ] Photo affichée sur la carte (web + mobile)
- [ ] Accès photo authentifié uniquement (URL présignée ; jamais publique, jamais sur le wallet)

## D. Wallet NFC — badgeage (dépend d'enrôlements externes)
- [ ] Google Smart Tap : après enrôlement Google + `GOOGLE_WALLET_SMART_TAP_ISSUER_ID` + lecteur Elatec en Smart Tap → tap fonctionne
- [ ] Apple .pkpass : après dépôt du cert Pass Type ID (`APPLE_WALLET_*`) → bouton Apple Wallet génère le passe
- [ ] Apple badge NFC : après entitlement NFC & SE (EEE) → tap iPhone

## E. App mobile Android (build Expo requis — non testable en CI)
- [ ] `expo prebuild` + dev-client installé sur Android réel
- [ ] Module HCE : ouvrir la carte → taper sur lecteur Elatec (AID `F0414343454C594F01`) → `card_uid` lu
- [ ] Lecture UID : Profil → « Lier ma carte actuelle » → scan carte physique → UID lié (visible côté admin)
- [ ] Carte réaliste affichée (fond, logo, photo)

## F. Back-office super-admin
- [ ] Créer établissement (entreprise/école/université/asso), siteCode 4 chiffres
- [ ] Créer admin → e-mail mdp provisoire → changement forcé à la 1ère connexion
- [ ] Super-admin : réinitialiser le mot de passe d'un user
- [ ] Supprimer un admin
- [ ] Voir/chercher tous les étudiants ; fiche établissement (SIRET, adresse, contacts add/remove)
- [ ] Créer un étudiant + import CSV
- [ ] Stats par établissement (inscrits ; Wallet/bons plans = placeholders pour l'instant)

## G. Sécurité / infra
- [ ] HTTPS valide (accelyo.fr), renouvellement Let's Encrypt auto
- [ ] Pare-feu actif (22/80/443 only)
- [ ] Sauvegardes quotidiennes (pg_dump + volume MinIO)
- [ ] Révocation carte → coupe l'accès partout (app + Google Wallet)
- [ ] Suspension étudiant (isActive=false) → /me renvoie « Accès révoqué »

## H. Migration parc existant (par prospect — cf. PLAYBOOK_DEMATERIALISATION.md)
- [ ] Audit lecteurs (techno, identifiant, système d'accès, Wiegand/OSDP + format)
- [ ] Lecteur Elatec configuré sur l'AID Accelyo (SDK TWN4)
- [ ] Mapping étudiant↔badge (CSV/API) ou lecture UID
- [ ] Double fonctionnement carte physique + téléphone

## J. Module Contenu + rôle Éditeur + équipe (v1.6.0)
- [ ] Admin/Éditeur : onglet **Contenu** → créer/éditer/supprimer Planning, Infos, Bibliothèque, Bons plans
- [ ] Le contenu créé apparaît dans l'app étudiante (onglets correspondants)
- [ ] Admin établissement : page **Équipe** → inviter un **Éditeur** (e-mail mdp provisoire) ; Bloquer / Débloquer / Réinitialiser / Supprimer
- [ ] Connexion **Éditeur** → ne voit QUE « Contenu » + « Paramètres » (pas Étudiants/Cartes/etc.)
- [ ] Éditeur bloqué (isActive=false) → ne peut plus se connecter
- [ ] Cloisonnement : un admin/éditeur ne voit/gère QUE le contenu et l'équipe de SON établissement
- [ ] Super-admin : sélecteur d'établissement pour gérer contenu/équipe de n'importe quel tenant

## I. À nettoyer avant prod réelle
- [ ] Supprimer les 12 établissements de démo (seed) + données fictives
- [ ] Vérifier qu'aucune donnée de test ne traîne
