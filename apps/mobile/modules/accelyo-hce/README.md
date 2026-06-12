# accelyo-hce — module natif HCE Android (Expo local module)

Émulation de carte (Host Card Emulation) pour faire **badger la carte étudiante Accelyo**
sur un lecteur NFC (portique, Elatec) directement depuis l'app Android.
Protocole : voir `docs/NFC_HCE_PROTOCOL.md`. iOS : voir `docs/APPLE_NFC_SE_ENTITLEMENT_GUIDE.md`.

## Contenu
- `android/.../AccelyoHceService.kt` — HostApduService : répond aux APDU (SELECT→9000, READ→card_uid).
- `android/.../AccelyoHceModule.kt` — module Expo (pont JS) : `setCard` / `clear` / `isSupported` / `isEnabled`.
- `android/.../CardStore.kt` — stockage chiffré (EncryptedSharedPreferences) partagé module↔service.
- `android/.../res/xml/accelyo_apduservice.xml` — déclaration de l'**AID** `F0414343454C594F01`.
- `index.ts` — API JS.

## API JS
```ts
import * as Hce from '../../modules/accelyo-hce';
Hce.isHceSupported();      // Android + NFC HCE dispo ?
Hce.setCard(cardUid);      // arme la carte (valeur renvoyée au lecteur)
Hce.clearCard();           // désarme
Hce.isHceEnabled();        // une carte est-elle armée ?
```
Utilisé par `src/services/nfcService.ts` (`startHCE` / `stopHCE`).

## Build & test (sur un VRAI appareil Android — pas d'émulateur NFC)
Ce module ne fonctionne **qu'avec un build natif** (pas dans Expo Go). Il faut un *dev client* / build EAS.

1. **Prebuild** (génère le projet android natif, lie le module local) :
   ```bash
   cd apps/mobile
   npx expo prebuild --platform android
   ```
2. **Build dev-client** et installer sur un téléphone Android (NFC activé) :
   ```bash
   npx expo run:android        # build local (Android SDK requis)
   # ou EAS:  eas build -p android --profile development
   ```
3. **Tester** : se connecter dans l'app → ouvrir la carte (l'app appelle `startHCE` → `setCard(cardUid)`),
   puis approcher le dos du téléphone d'un **lecteur Elatec configuré sur l'AID `F0414343454C594F01`**.
   Le lecteur envoie `SELECT AID` (→ 9000) puis `READ` (→ reçoit le `card_uid`), que le backend valide.

## Côté lecteur Elatec
Configurer le lecteur (ex. TWN4) en mode lecteur ISO 14443-4 :
- envoyer `SELECT AID` `00 A4 04 00 09 F0414343454C594F01 00`,
- puis `READ` `80 CA 00 00 00`,
- lire la réponse (`card_uid` + `90 00`) et valider via l'API (existence / non révoquée / non expirée).

## Notes
- **Android 24+ / appareil avec HCE** (la quasi-totalité des téléphones NFC).
- L'app n'a pas besoin d'être au premier plan : le service HCE répond même en arrière-plan
  (`requireDeviceUnlock=false` ; durcissable si besoin).
- Le `card_uid` transmis est le **même** que le QR et Smart Tap → un seul référentiel d'identité.
- Anti-rejeu : la validation en ligne (API) reste la source de vérité ; un challenge-réponse APDU
  pourra être ajouté plus tard (option B de la spec).
