# Accelyo — Vision produit & roadmap

*Document de travail — dernière mise à jour : juin 2026*

---

## 1. En une phrase

Accelyo dématérialise la carte d'usager (étudiant, adhérent, collaborateur) dans une application mobile aux couleurs de chaque établissement, et l'enrichit de services qui **allègent le travail des équipes** et **facilitent la vie des usagers** — tout en respectant la souveraineté et la propriété des données.

Le positionnement n'est pas « une carte numérique » mais : **« on simplifie la vie de vos équipes et de vos usagers »**.

---

## 2. Le modèle

Accelyo est un modèle **B2B2C** :

- **B2B** — on vend la plateforme aux établissements (écoles, bibliothèques, entreprises, associations). C'est le revenu principal, par abonnement / par carte.
- **B2C** — au sein de l'app, une rubrique **« Bonnes affaires »** propose aux usagers des bons plans et codes promo de partenaires. C'est un revenu commercial complémentaire, qui ne fonctionne que si l'app est réellement utilisée au quotidien — d'où l'importance des services utiles (carte, planning, emprunts, infos…).

**Parcours type d'un client :**
1. Un établissement est intéressé et nous contacte (site vitrine).
2. Conditions tarifaires réglées, contrat signé.
3. On crée son **compte admin** et on configure son espace : secteur, logo, couleurs.
4. L'admin saisit ses usagers (ou les importe) ; chaque usager reçoit un **lien d'activation**.
5. L'usager télécharge l'app, active sa carte, l'utilise (et peut l'ajouter à Apple/Google Wallet).
6. À tout moment, l'admin peut suspendre ou révoquer un accès — **partout, y compris dans les Wallets**.

---

## 3. Les trois rôles

- **Accelyo (super-admin)** — gère les établissements clients, le catalogue de bons plans, la facturation.
- **Admin établissement** — gère **uniquement ses propres usagers** (isolation stricte), les organise (classes/groupes), publie infos/planning/activités, suspend ou révoque les accès.
- **Usager (étudiant / adhérent / collaborateur)** — utilise l'app : sa carte, ses services selon le secteur, les bons plans (sur consentement).

---

## 4. Les piliers de la plateforme

### 4.1 Multi-tenant & isolation
Chaque établissement est un espace strictement cloisonné. Un admin ne peut techniquement voir que ses propres usagers. *(Déjà en place dans le socle.)*

### 4.2 White-label (marque du client)
À la signature, on récupère **logo + codes couleur** du client. L'app, la carte et l'espace d'administration s'affichent **à ses couleurs**. Chaque client a l'impression que c'est *son* app.

### 4.3 Multi-secteurs (modules activables)
Chaque client a un **secteur**, qui active les bons **modules** et le bon vocabulaire. Au lancement :

- **École** — carte, classes/groupes, emploi du temps, informations, activités.
- **Bibliothèque** — carte, livres empruntés (date d'emprunt, date de retour, **prolongation**), informations.

À venir : entreprise (badge collaborateur, services), association (adhésion, événements). Le secteur peut aussi **renommer** les libellés (« carte étudiante » → « badge collaborateur »).

### 4.4 Sources de données (3 niveaux)
Pour ne **jamais ajouter de travail** aux équipes, on s'adapte à leur existant :

1. **Connexion API** au logiciel existant (système de prêt, scolarité…) → synchronisation automatique, zéro double-saisie.
2. **Import CSV** quand il n'y a pas d'API mais qu'un export est possible.
3. **Saisie manuelle** dans l'admin Accelyo, pour les petites structures sans logiciel.

### 4.5 Hébergement & propriété des données
Au choix du client : **cloud** (chez Accelyo, en France) ou **on-premise** (chez le client). Dans tous les cas, le client reste **pleinement propriétaire** de ses données. *(Le mode cloud/on-premise est déjà prévu dans l'architecture.)*

---

## 5. L'app de l'usager (le hub)

L'app est le cœur de l'expérience et le moteur de l'usage quotidien :

- **Ma carte** — carte dématérialisée signée, avec export vers **Apple Wallet / Google Wallet** (tap NFC sur les lecteurs Elatec).
- **Sections selon le secteur** — emploi du temps & classes (école), emprunts & prolongation (bibliothèque), etc.
- **Infos & activités** — annonces et événements publiés par l'établissement.
- **Bonnes affaires** — bons plans partenaires (sur **consentement** de l'usager).

**Suspension / révocation partout :** quand l'admin suspend ou révoque une carte, l'accès est coupé dans l'app **et** le passe Apple/Google Wallet est passé en « expiré/inactif » à distance. Une carte révoquée ne vaut plus rien, où qu'elle soit.

---

## 6. RGPD & consentement

Point de conception essentiel : séparer deux usages avec deux bases légales distinctes.

- **La carte et les services** reposent sur le **contrat** avec l'établissement (base légale claire).
- **Les bons plans** sont du marketing : ils nécessitent le **consentement explicite de l'usager** (opt-in dans l'app, révocable). On ne mélange jamais les deux.

C'est non seulement obligatoire, c'est aussi un **argument de vente** : « respectueux du RGPD par conception », hébergement souverain France, données chiffrées, journal d'audit.

---

## 7. Ce qui existe déjà (socle technique)

- Plateforme multi-tenant avec isolation par établissement.
- Comptes admin, création/import CSV des usagers, dashboard d'administration.
- Carte signée (RSA), validation NFC (HMAC + anti-rejeu), suspension/révocation des cartes.
- Modes **cloud / on-premise** prévus dans l'architecture.
- Application mobile (base React Native avec NFC HCE Android).
- Site vitrine multi-pages en ligne (accelyo.fr), HTTPS, hébergement France.
- Intégration **Google Wallet** codée (génération du passe + bouton) — à finaliser.

---

## 8. Roadmap par étapes

Chaque étape est livrable et utile seule. On avance couche par couche pour ne pas s'éparpiller.

**Étape 0 — Finaliser Google Wallet** *(en cours)*
Déployer la clé, tester la carte dans Google Wallet, puis Smart Tap NFC.

**Étape 1 — Socle de l'app usager (MVP)**
Lien d'activation par e-mail → l'usager télécharge l'app, active son compte, voit **sa carte**, l'ajoute au Wallet. Authentification usager **révocable** (suspension = accès coupé partout).

**Étape 2 — White-label & secteurs**
Logo + couleurs par client ; type de secteur qui active les modules et le vocabulaire. Branding appliqué à l'app, la carte et le dashboard.

**Étape 3 — Bonnes affaires (monétisation)**
Catalogue de bons plans géré par Accelyo, écran dans l'app, consentement RGPD opt-in.

**Étape 4 — Modules secteurs**
- *École* : classes/groupes, emploi du temps, infos, activités.
- *Bibliothèque* : emprunts (dates, prolongation), via API / CSV / saisie.

**Étape 5 — Apple Wallet & NFC complet**
Passes Apple Wallet, puis démarche d'entitlement NFC Apple pour le tap iPhone.

**Étape 6 — Intégrations & on-premise**
Connecteurs vers les logiciels existants (prêt, scolarité), déploiement on-premise pour les grands comptes.

---

## 9. Dépendances externes à prévoir

- **Google Wallet** — compte émetteur *(fait)*, clé de service *(faite)*.
- **Apple Developer** (99 $/an) — pour l'app iOS, Apple Wallet, et la cible NFC.
- **Google Play Console** (25 $ une fois) — pour publier l'app Android.
- **Partenaires bons plans** — à démarcher pour alimenter la rubrique commerciale.

---

*Ce document est une boussole évolutive : il bouge au fil des décisions. Prochaine priorité à confirmer ensemble.*
