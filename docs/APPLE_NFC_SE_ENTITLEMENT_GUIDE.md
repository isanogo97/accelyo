# Apple « NFC & SE Platform » — Guide de candidature à l'entitlement

> Objectif : obtenir le droit de faire **badger la carte étudiante Accelyo en NFC depuis l'app iPhone**
> (émulation de carte / HCE), comme l'app Android — **sans passer par Apple Wallet ni par un partenaire**
> (CBORD, Transact…). Rendu possible depuis 2024 par les engagements antitrust d'Apple vis-à-vis de la
> Commission européenne (ouverture du NFC aux apps tierces dans l'**EEE**).

## En une phrase
Accelyo est une entité **française (EEE)** → **éligible**. L'accès à la solution technique NFC est
accordé selon des critères « équitables, objectifs, transparents et non-discriminatoires » et **l'accès
NFC lui-même est gratuit**. Le cas d'usage « **accès / tap-to-enter** » est explicitement couvert.

---

## 1. Pré-requis (à réunir avant de candidater)

| Élément | Détail |
|---|---|
| Compte Apple Developer **Organization** | Pas un compte « Individual ». Au nom de l'entité légale Accelyo (EEE). |
| Numéro **D-U-N-S** | Identifiant entreprise exigé par Apple (gratuit, ~5–30 j si à créer). |
| **Apple Business Register (ABR)** | Portail où l'on déclare et fait approuver la « configuration produit » NFC & SE. |
| App distribuée dans l'**EEE** | L'entitlement HCE/NFC ne fonctionne que pour les utilisateurs de l'Espace économique européen. |
| Conformité **RGPD + sécurité** | Politiques écrites (traitement des données, divulgation, gestion/remédiation des vulnérabilités). |

## 2. Étapes de candidature

1. **Vérifier l'entité** : compte Apple Developer Organization actif, D-U-N-S rattaché, accord
   « Apple Developer Program License » à jour.
2. **Apple Business Register** : créer la fiche entreprise, puis créer une **configuration produit
   « NFC & SE Platform »** décrivant l'usage (carte d'accès étudiante, émulation HCE).
3. **Demander l'entitlement `NFC & SE Platform`** depuis le compte développeur (formulaire Apple). On y
   déclare l'usage « access » (et non « payment »), ce qui allège les exigences (pas de PCI DSS/EMVCo,
   qui ne concernent que le paiement in-store).
4. **Signer l'accord commercial NFC & SE** proposé par Apple (l'accès NFC est gratuit ; des frais ne
   s'appliquent qu'à certains usages du Secure Element — à vérifier au moment de la signature).
5. **Fournir les politiques de conformité** : politique de protection des données (RGPD), procédure de
   divulgation/remédiation des vulnérabilités, engagement à notifier Apple de tout incident de sécurité.
6. **Activer la capability technique** : une fois l'entitlement accordé, ajouter la capability dans Xcode
   / le provisioning profile, puis implémenter avec les APIs **`CardSession` / NFC & SE Platform**
   (iOS 17.4+ en Europe, étendu sur iOS 18). → côté Accelyo, voir `docs/NFC_HCE_PROTOCOL.md`.

## 3. Ce qu'Apple va regarder (anticiper)
- **Sécurité** : comment la carte (identifiant + JWT signé) est protégée, stockée, révoquée.
- **Confidentialité** : minimisation des données, RGPD, pas d'exposition de données perso.
- **Fiabilité** : procédure vulnérabilités + notification d'incident.
- **Légitimité de l'usage** : carte d'accès pour des établissements clients (B2B2C) — légitime.

## 4. Attentes réalistes
- **C'est un dossier**, pas une case à cocher : prévoir des allers-retours avec Apple et un délai
  (quelques semaines à quelques mois selon la réactivité et le D-U-N-S/ABR).
- **Mais c'est ouvert et non-discriminatoire** (contrainte UE) : ce n'est plus « sur invitation » comme
  l'ancien programme Wallet/partenaires. Une PME EEE peut l'obtenir.
- **Périmètre géographique** : fonctionne pour les iPhone **dans l'EEE**. Pour des campus français, c'est
  exactement la cible.

## 5. Pendant que le dossier avance
- **Android** : l'app HCE fonctionne déjà (à finaliser côté AID — voir spec).
- **iPhone** : la carte **visuelle** est déjà dans l'app + Google/Apple Wallet ; le **badge NFC iPhone**
  s'activera dès l'entitlement obtenu (le code sera prêt en miroir de l'Android).
- **Google** : en parallèle, Smart Tap (Android wallet) reste une option (voir `WALLET_NFC_BADGING.md`).

## 6. Liens utiles
- Apple Developer — HCE-based contactless NFC transactions (EEE) : https://developer.apple.com/support/hce-transactions-in-apps/
- Apple Developer — NFC & SE Platform : https://developer.apple.com/support/nfc-se-platform/
- Apple Developer — Apps in the EU (DMA) : https://developer.apple.com/support/dma-and-apps-in-the-eu/
- Commission européenne — Engagements Apple (AT.40452) : https://ec.europa.eu/competition/antitrust/cases1/202428/AT_40452_10155330_9978_4.pdf

> ⚠️ Les modalités exactes (formulaires, frais, version iOS minimale) évoluent côté Apple. Vérifier les
> deux pages « Apple Developer Support » ci-dessus au moment de la candidature.
