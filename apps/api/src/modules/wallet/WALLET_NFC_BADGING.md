# Badgeage NFC des passes Wallet (Accelyo)

> Doc honnête à destination du client et de l'équipe. Objectif : « taper le
> téléphone sur le lecteur du portique » pour badger, comme une carte.

## 1. Pourquoi un passe Wallet n'est PAS un badge Mifare/Navigo

Un badge classique (Mifare Classic/DESFire, Navigo, etc.) est une **carte à
puce NFC** que le lecteur lit directement. On a longtemps cru qu'un passe
Google/Apple Wallet « émule une carte » de la même façon. **C'est faux.**

- Le téléphone **n'émule pas** une carte Mifare/Navigo arbitraire quand on
  présente un passe Wallet. Les wallets utilisent des **protocoles NFC
  propriétaires et chiffrés**, pas l'UID brut d'une carte Mifare.
- **Google Wallet** utilise le protocole **Smart Tap** (Google Pay/Wallet
  VAS). Le passe ne « parle » à un lecteur que si ce lecteur implémente
  Smart Tap et que l'émetteur (Accelyo) est enrôlé chez Google.
- **Apple Wallet** utilise **VAS (Value Added Service) / NFC** d'Apple, un
  protocole **différent** de Smart Tap, et **fermé** (entitlement sur
  approbation Apple).

**Conséquence directe :** un lecteur de badge générique existant ne lira
**pas forcément** un passe Wallet. Le lecteur doit explicitement supporter
le protocole du wallet visé (Smart Tap pour Google, VAS pour Apple).

## 2. Condition matérielle clé : le lecteur

Le portique / lecteur doit supporter le protocole du wallet :

- **Google → Smart Tap.** Les lecteurs **Elatec** (déjà ciblés par Accelyo
  pour le badgeage HCE) peuvent être configurés en **mode Smart Tap**. C'est
  le chemin le plus court côté wallet.
- **Apple → VAS + NFC.** Il faut un lecteur **compatible Apple VAS** ET
  l'**entitlement NFC Apple** côté passe (voir §4). Sans les deux, le passe
  Apple reste purement visuel.

Tant que le lecteur n'est pas configuré pour le bon protocole, le passe ne
sera pas lu en NFC — même si tout le reste est en place côté code.

## 3. Chemin Google (faisable dès aujourd'hui)

Le code est **déjà Smart Tap-ready** : il s'active automatiquement dès que
l'émetteur est enrôlé. Étapes :

1. **S'enrôler au programme Smart Tap** dans la Google Wallet API Console
   (Business/Pass profile → Smart Tap).
2. **Obtenir le « collector ID / redemption issuer ID »** fourni par Google
   après enrôlement.
3. Le renseigner dans la variable d'environnement
   **`GOOGLE_WALLET_SMART_TAP_ISSUER_ID`**.
4. **Configurer le lecteur Elatec** en mode Smart Tap (firmware/profil VAS).
5. Au badgeage, le passe transmet **`smartTapRedemptionValue` = `cardUid`**
   (la même valeur que le QR et le flux HCE). Le **backend valide cette
   valeur exactement comme le flux QR/HCE existant** (aucune nouvelle logique
   de validation à écrire).

Une fois ces étapes faites, **aucune modification de code n'est nécessaire** :

- Sur le `genericClass` : `enableSmartTap: true` et
  `redemptionIssuers: [GOOGLE_WALLET_SMART_TAP_ISSUER_ID]` sont ajoutés
  automatiquement.
- Sur le `genericObject` : `smartTapRedemptionValue` (= `cardUid`) est ajouté
  automatiquement.

Tant que `GOOGLE_WALLET_SMART_TAP_ISSUER_ID` est **absent**, le passe reste
un **passe visuel normal** (couleur de marque, logo, heroImage, QR) sans
Smart Tap : **zéro régression**.

## 4. Chemin Apple (gated, sur approbation)

L'accès NFC d'Apple Wallet (**Apple Wallet Access** / certificats NFC) est
**réservé et délivré sur approbation Apple**. C'est un programme **fermé**,
**long à obtenir** et **non garanti**.

- Le code prépare le dict `nfc` du `pass.json` **derrière un flag** :
  - `APPLE_WALLET_NFC_ENABLED=true` **ET**
  - `APPLE_WALLET_NFC_PUBLIC_KEY=<clé publique ECDH P-256 base64>`
  - → ajoute `nfc: { message: <cardUid>, encryptionPublicKey: <clé> }`.
- **iOS n'honore ce dict QUE si le passe est signé avec un certificat
  disposant de l'entitlement NFC Apple.** Sans cet entitlement, iOS **ignore
  simplement** le dict : le passe Apple reste **visuel** (badgeage NFC
  impossible sur iPhone).

**Démarche (sans promesse de résultat) :**

1. Déposer une demande **Apple Wallet Access / NFC** auprès d'Apple
   (compte Apple Developer Entreprise, justification du cas d'usage).
2. Si approuvé, Apple fournit la **clé publique** à mettre dans
   `APPLE_WALLET_NFC_PUBLIC_KEY` et un certificat NFC dédié.
3. Activer `APPLE_WALLET_NFC_ENABLED=true` une fois l'entitlement actif.

Tant que ces éléments sont absents, le passe Apple reste un **passe visuel
normal** (storeCard + QR + branding) : **zéro régression**.

## 5. Chemin universel disponible aujourd'hui : l'app Android HCE

Indépendamment des wallets, Accelyo dispose **déjà** d'une app **Android avec
émulation NFC HCE** (`apps/mobile`) :

- L'app émule un tag NFC « maison » que les **lecteurs Elatec d'Accelyo**
  lisent directement.
- Fonctionne **sur Android sans wallet** (ni Smart Tap ni VAS).
- Sur **iPhone**, le badgeage NFC dépend de l'**entitlement Apple** (HCE
  n'est pas librement ouvert aux apps tierces sur iOS) — donc l'iPhone reste
  tributaire du chemin Apple §4.

## 6. Recommandation

1. **Badgeage wallet Android → Smart Tap (Google) + lecteurs Elatec en mode
   Smart Tap.** Le code est prêt ; il ne reste que l'enrôlement Google et la
   config lecteur.
2. **Garder l'app HCE Android** comme chemin universel immédiat (déjà
   opérationnel sur le parc Elatec).
3. **Déposer en parallèle la demande d'entitlement NFC Apple** pour couvrir
   l'iPhone à terme — sans en faire un prérequis de livraison (programme
   gated, délai et issue incertains).

## 7. Récapitulatif des variables d'environnement

| Variable | Effet |
|---|---|
| `GOOGLE_WALLET_SMART_TAP_ISSUER_ID` | Active Smart Tap côté Google (classe + objet). Absent → passe visuel normal. |
| `APPLE_WALLET_NFC_ENABLED` | Flag d'activation du dict `nfc` Apple (défaut `false`). |
| `APPLE_WALLET_NFC_PUBLIC_KEY` | Clé publique ECDH P-256 (base64) du programme NFC Apple. Requise avec le flag. |

> Note : ajouter ces champs n'a **aucun effet visible** tant que le matériel
> (lecteur Smart Tap/VAS) et les enrôlements (Google / entitlement Apple) ne
> sont pas en place. Le code est conçu pour s'activer **sans redéploiement de
> logique**, uniquement via ces variables.
