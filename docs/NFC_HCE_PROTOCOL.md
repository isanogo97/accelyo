# Protocole NFC HCE Accelyo — contrat partagé Android / iOS / lecteurs Elatec

> But : un **seul** protocole contactless pour que la même carte (le JWT signé Accelyo) soit lue à
> l'identique, que le téléphone soit Android (HCE) ou iPhone (NFC & SE Platform, EEE), par les lecteurs
> Elatec configurés en mode lecteur ISO 14443-4. **Ne jamais changer ce contrat sans re-provisionner les
> lecteurs.**

## 1. La donnée transportée : `CardPayload` (déjà en place)
JWT **RS256** signé par l'API (clé privée serveur ; les lecteurs valident avec la clé publique, hors-ligne).
Défini dans `packages/shared/src/types/card.ts` :
```
{
  sub:          <studentId>,
  university_id:<uuid>,
  card_uid:     <hex>,        // identifiant carte (= valeur QR / Smart Tap)
  issued_at:    <epoch s>,
  expires_at:   <epoch s>,
  permissions:  string[],
  fingerprint:  <hash device> // binding appareil
}
```
Validation lecteur = signature RS256 OK + `expires_at` non dépassé + `card_uid` non révoqué (check Redis
en ligne, cf. `cards.service` / NFC anti-rejeu HMAC existant).

## 2. Le protocole APDU (ISO 7816-4 sur ISO 14443-4)

### 2.1 AID (Application Identifier) Accelyo
AID propriétaire enregistré côté téléphone (Android `apduservice.xml`, iOS `CardSession`) ET côté lecteur
Elatec. Format proposé (catégorie « proprietary », RID + PIX) :
```
AID = F0 41 43 43 45 4C 59 4F 01      (= 'F0' + "ACCELYO" ASCII + version 01)
```
> Choisir l'AID définitif une fois, le figer dans : (a) le manifest Android, (b) la config iOS,
> (c) la config des lecteurs Elatec. C'est le point de synchronisation critique.

### 2.2 Échange
| Étape | Lecteur → Téléphone (APDU) | Téléphone → Lecteur (réponse) |
|---|---|---|
| 1. SELECT AID | `00 A4 04 00 09 F0414343454C594F01 00` | `90 00` (AID reconnu) |
| 2. READ CARD | `80 CA 00 00 00` (GET DATA propriétaire) | `<payload> 90 00` |

`<payload>` = le JWT signé. Comme un JWT dépasse souvent une APDU, deux options (à figer) :
- **A (recommandé)** : ne transmettre que le `card_uid` (court) + une **signature courte** (HMAC/`fingerprint`)
  et laisser le lecteur valider en ligne (comme le flux QR/Smart Tap actuel). Simple, robuste, rapide.
- **B** : transmettre le JWT complet en **chaînage APDU** (status `61 xx` + `GET RESPONSE 00 C0 00 00 xx`).
  Validation 100 % hors-ligne, mais plus de complexité.
> L'option A réutilise exactement la logique de validation déjà déployée (card_uid + check serveur) et
> aligne NFC, QR et Smart Tap sur la **même valeur** (`card_uid`). Reco : **option A** pour le badge d'accès.

Status words : `90 00` succès ; `6A 82` AID inconnu ; `69 85` carte non active (suspendue/expirée).

## 3. Android (HCE) — état & finalisation
- Fichier : `apps/mobile/src/services/nfcService.ts` (+ `react-native-nfc-manager`).
- Aujourd'hui : prépare le token/payload en mémoire (`startHCE`), mais **l'AID custom + le HostApduService
  ne sont pas encore branchés** (commentaire « en l'absence d'AID custom… »).
- À finaliser : déclarer un **HostApduService** + `apduservice.xml` avec l'AID §2.1, router les APDU
  SELECT/READ vers la réponse préparée. Nécessite un **module natif / config plugin Expo** (prebuild).

## 4. iOS (NFC & SE Platform / HCE) — plan, dès l'entitlement obtenu
Pré-requis : entitlement **Apple NFC & SE Platform** (cf. `APPLE_NFC_SE_ENTITLEMENT_GUIDE.md`), iOS 17.4+
(EEE). API : `CardSession` (framework CoreNFC / NFC & SE Platform).

Esquisse (Swift, module natif Expo) :
```swift
import CoreNFC

// 1. Enregistrer l'AID Accelyo et démarrer une session de présentation de carte.
let session = try await CardSession() // nécessite l'entitlement NFC & SE
// 2. Sur réception d'une APDU du lecteur :
for try await event in session.events {
    if case .readerDetected = event { /* lecteur Elatec détecté */ }
    if case .received(let apdu) = event {
        let resp = handleApdu(apdu)        // même logique que §2.2 (SELECT / READ)
        try await session.respond(resp)    // renvoyer <payload> 90 00
    }
}
```
`handleApdu` = **exactement le même routage que l'Android** (SELECT AID → 9000 ; READ → card_uid+sig → 9000).
→ on factorise idéalement la logique APDU dans un module TS partagé (`packages/`), les natifs Android/iOS ne
font que le transport.

Limites à noter : iPhone **EEE uniquement** ; déclenchement via Field Detect / double-clic selon réglage
utilisateur ; l'app doit être au premier plan ou configurée comme app NFC par défaut (selon le mode retenu).

## 5. Lecteurs Elatec — alignement
- Configurer le lecteur (TWN4 / type déployé) en **mode lecteur ISO 14443-4** qui envoie le `SELECT AID`
  §2.1 puis la commande READ §2.2.
- La validation backend (signature/expiration/révocation) reste celle déjà en place (module `nfc` de l'API,
  anti-rejeu HMAC, `card_uid`).
- Le **même** `card_uid` sert pour : NFC (Android+iOS), QR (in-app/Wallet) et Smart Tap (Google) → un seul
  référentiel d'identité de carte.

## 6. Récap stratégie badge
| Plateforme | Voie | État |
|---|---|---|
| Android | HCE app (AID Accelyo) | En place, AID/HostApduService à finaliser |
| iPhone (EEE) | NFC & SE Platform (HCE app) | **Prêt à implémenter dès l'entitlement** |
| iPhone/Android | QR (in-app + Wallet) | Fait (fallback universel) |
| Android (Wallet) | Google Smart Tap | Code prêt (enrôlement Google requis) |

Sources : voir `APPLE_NFC_SE_ENTITLEMENT_GUIDE.md`.
