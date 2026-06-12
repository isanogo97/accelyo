# Playbook — Dématérialiser un parc de cartes existant

> Pour un client qui a déjà des étudiants équipés de **cartes physiques** et veut passer à la
> carte Accelyo sur smartphone. Document de cadrage commercial + technique.

## 0. Le principe (à dire au client d'entrée)
Une carte ne « contient » pas le droit d'accès : elle porte un **identifiant**, et c'est le **système de
contrôle d'accès** (logiciel + contrôleur derrière les portiques) qui décide. **Dématérialiser ≠ copier la
carte** : on fait en sorte que le téléphone présente un identifiant que ce système accepte, et on
**émet une nouvelle carte numérique signée et révocable**. On ne récupère **jamais** les clés
cryptographiques des cartes existantes — on n'en a pas besoin.

## 1. Audit (3 questions, à poser avant tout devis)
1. **Techno des lecteurs ?** 125 kHz (basse fréquence), Mifare Classic, DESFire, ISO 14443-4 / NFC… ?
   → détermine si les lecteurs peuvent lire un téléphone (HCE = **13,56 MHz ISO 14443-4** uniquement).
2. **Quel identifiant ouvre la porte ?** UID de la puce ? numéro dans un secteur ? numéro étudiant ?
3. **Quel système de contrôle d'accès, et quel format ?** Côté lecteur → contrôleur, c'est presque
   toujours du **Wiegand** (ex. 26 ou 37 bits = *facility code* + *card number*) ou de l'**OSDP** (moderne,
   sécurisé). Le contrôleur attend l'identifiant **dans ce format précis**.

## 2. Les deux couches de « convention » (standards)
- **Sans-contact** : **ISO/IEC 14443** (radio + anticollision) + **ISO/IEC 7816-4** (commandes **APDU** et
  **AID** = identifiant d'application). Accelyo utilise un AID propriétaire (`F0414343454C594F01`) en HCE.
- **Contrôle d'accès** : **Wiegand / OSDP** + le **format de numéro de carte** (facility code + card
  number). C'est là que se joue réellement l'intégration : l'identifiant Accelyo doit arriver au
  contrôleur dans le format attendu.

## 3. Cryptographie — qui détient quoi
| | Clés | On les a ? | Rôle |
|---|---|---|---|
| Carte **existante** du client | symétriques (Crypto1 / AES DESFire) | **Non, et inutile** | sécurise leur carte physique |
| Carte **Accelyo** | **asymétriques** (RSA/ECC) : serveur signe, lecteur vérifie | Oui (les nôtres) | carte signée, vérifiable hors-ligne |
| Anti-rejeu / session | **HMAC** | Oui | empêche le rejeu d'un tap |
| Données au repos | **AES-256** | Oui | chiffrement en base |

Dématérialiser **ne demande pas** les clés du client : on émet une **nouvelle** carte numérique
(signée, horodatée, **révocable instantanément** côté serveur) — plus sûr qu'un numéro statique gravé.

## 4. Compatibilité des lecteurs
- **Lecteurs déjà 13,56 ISO 14443-4 / multi-techno (ex. Elatec)** → on les **configure** pour accepter
  aussi l'AID Accelyo (et Smart Tap pour Google Wallet). Pas de remplacement matériel.
- **Lecteurs 125 kHz ou Mifare Classic « UID seul »** → le téléphone ne peut PAS les imiter (le HCE ne fait
  ni 125 kHz ni Mifare Classic, et l'UID HCE est aléatoire). Il faut **remplacer/ajouter une tête de
  lecture multi-techno** (Elatec) → **ligne de devis**.

## 5. Migration pas à pas
1. **Enrôlement / mapping étudiant ↔ identifiant.** Deux voies (déjà supportées) :
   - le client fournit le mapping étudiant ↔ badge (**CSV** ou **API**) ;
   - **lecture de l'UID** de la carte physique existante depuis l'app (fonction d'enrôlement) pour lier la
     carte actuelle au compte Accelyo.
2. **Provisioning des lecteurs** : configurer l'AID Accelyo (+ format Wiegand/OSDP attendu par le
   contrôleur). Intégration avec le logiciel d'accès du client si nécessaire.
3. **Double fonctionnement** (transition) : **carte physique ET téléphone marchent en parallèle** —
   personne n'est bloqué pendant la bascule.
4. **Bascule progressive** puis **révocation** des cartes physiques au rythme voulu (révocation serveur
   instantanée, sans récupérer la carte).

## 6. Cadre commercial
Dématérialiser un parc existant = **projet d'intégration**, pas « installer une app » : audit lecteurs +
intégration au système d'accès + éventuel upgrade de têtes de lecture. C'est la norme du secteur et une
**source de revenus** (setup + maintenance + matériel). Découpage type :
- **Audit / cadrage** (forfait),
- **Intégration** (config lecteurs + mapping + connecteur système d'accès),
- **Matériel** (têtes multi-techno si parc legacy),
- **Abonnement** SaaS par carte/étudiant,
- **Support / maintenance**.

## 7. Checklist à collecter chez le prospect
- [ ] Modèles exacts des lecteurs + firmware
- [ ] Techno : fréquence + type de puce (125 kHz / Mifare Classic / DESFire / ISO-DEP)
- [ ] Identifiant qui ouvre la porte (UID / numéro secteur / numéro étudiant)
- [ ] Système de contrôle d'accès (éditeur + version)
- [ ] Protocole lecteur→contrôleur : **Wiegand (combien de bits ?) ou OSDP** + format du numéro
- [ ] Mapping étudiant ↔ badge disponible en CSV ou via API ?
- [ ] Volumétrie (nb d'étudiants, nb de portiques/sites)

> Référence technique du protocole NFC Accelyo : `docs/NFC_HCE_PROTOCOL.md`.
> Voie iPhone (badge natif EEE) : `docs/APPLE_NFC_SE_ENTITLEMENT_GUIDE.md`.
