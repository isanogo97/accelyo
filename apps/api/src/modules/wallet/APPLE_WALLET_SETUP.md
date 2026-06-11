# Configuration Apple Wallet (.pkpass) — Carte etudiante Accelyo

Ce guide explique comment activer la generation des passes **Apple Wallet**
pour la carte etudiante. Tant que le certificat Apple n'est pas fourni,
l'endpoint `GET /api/v1/student-auth/me/wallet/apple` renvoie un **503**
(`{"success":false,"error":{"message":"Apple Wallet pas encore configure"}}`)
et rien d'autre n'est impacte (Google Wallet continue de fonctionner).

> Le passe est genere **localement** sur le serveur, sans aucun appel reseau
> sortant vers Apple. L'etudiant clique lui-meme pour le telecharger sur son
> appareil (opt-in). Aucune donnee ne quitte votre infrastructure.

---

## Pre-requis

- Un compte **Apple Developer** payant (99 $/an) — le votre, en tant que client.
- Un acces a un poste **macOS** (Trousseau d'acces) OU `openssl` pour manipuler
  le certificat.
- Votre **Team ID** (10 caracteres), visible sur
  https://developer.apple.com/account → Membership.

---

## 1. Creer un Pass Type ID

1. Allez sur https://developer.apple.com/account → **Certificates, Identifiers
   & Profiles** → **Identifiers**.
2. Cliquez sur **+**, choisissez **Pass Type IDs**, puis **Continue**.
3. Renseignez une description (ex. `Carte etudiante Accelyo`) et un identifiant
   au format `pass.fr.votreetablissement.carte` (commence toujours par `pass.`).
4. Validez. Notez cet identifiant : c'est votre **`APPLE_WALLET_PASS_TYPE_ID`**.

---

## 2. Generer le certificat du Pass Type ID

1. Toujours dans **Identifiers**, ouvrez votre Pass Type ID puis cliquez sur
   **Create Certificate**.
2. Apple demande un **CSR** (Certificate Signing Request) :
   - Sur macOS : Trousseau d'acces → menu **Assistant de certification** →
     **Demander un certificat a une autorite de certification…**.
   - Ou en ligne de commande :
     ```bash
     openssl req -new -newkey rsa:2048 -nodes \
       -keyout apple_pass_key.pem \
       -out request.csr \
       -subj "/CN=Carte etudiante Accelyo/O=Votre etablissement"
     ```
3. Televersez le `.csr`, puis **telechargez** le certificat genere
   (`pass.cer`).

### Convertir en PEM (cert + cle)

Si vous avez exporte un **.p12** depuis le Trousseau (certificat + cle privee) :

```bash
# Certificat (PEM)
openssl pkcs12 -in Certificates.p12 -clcerts -nokeys -out apple_pass_cert.pem -legacy

# Cle privee (PEM)
openssl pkcs12 -in Certificates.p12 -nocerts -nodes -out apple_pass_key.pem -legacy
```

Si vous avez genere le CSR vous-meme (etape 2, ligne de commande), vous avez
deja `apple_pass_key.pem` ; convertissez seulement le `.cer` :

```bash
openssl x509 -inform DER -in pass.cer -out apple_pass_cert.pem
```

> Si vous protegez la cle par mot de passe, renseignez
> `APPLE_WALLET_KEY_PASSPHRASE`. Sinon laissez la cle **sans passphrase**
> (`-nodes`) et ne definissez pas cette variable.

---

## 3. Certificat Apple WWDR (intermediaire)

Apple signe les passes via une autorite intermediaire (**Apple WWDR**).

1. Telechargez le certificat **Worldwide Developer Relations — G4** :
   https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
2. Convertissez-le en PEM :
   ```bash
   openssl x509 -inform DER -in AppleWWDRCAG4.cer -out apple_wwdr.pem
   ```

---

## 4. Deposer les 3 fichiers sur le serveur

Placez les trois fichiers PEM dans le dossier des secrets, monte dans le
conteneur sous `/run/secrets-wallet/` :

```
/opt/accelyo/secrets/apple_pass_cert.pem   ->  /run/secrets-wallet/apple_pass_cert.pem
/opt/accelyo/secrets/apple_pass_key.pem    ->  /run/secrets-wallet/apple_pass_key.pem
/opt/accelyo/secrets/apple_wwdr.pem        ->  /run/secrets-wallet/apple_wwdr.pem
```

Droits recommandes (lecture par le seul utilisateur du service) :

```bash
chmod 600 /opt/accelyo/secrets/apple_pass_*.pem /opt/accelyo/secrets/apple_wwdr.pem
```

---

## 5. Variables d'environnement (`.env`)

Ajoutez au `.env` de l'API :

```dotenv
APPLE_WALLET_PASS_TYPE_ID=pass.fr.votreetablissement.carte
APPLE_WALLET_TEAM_ID=ABCDE12345
# Chemins (valeurs par defaut ci-dessous, a ne changer que si besoin)
APPLE_WALLET_CERT_PATH=/run/secrets-wallet/apple_pass_cert.pem
APPLE_WALLET_KEY_PATH=/run/secrets-wallet/apple_pass_key.pem
APPLE_WALLET_WWDR_PATH=/run/secrets-wallet/apple_wwdr.pem
# Optionnel: seulement si la cle privee est protegee par mot de passe
# APPLE_WALLET_KEY_PASSPHRASE=motdepasse
```

Redemarrez l'API. Si les trois fichiers existent et que `PASS_TYPE_ID` +
`TEAM_ID` sont definis, l'endpoint sert directement le `.pkpass`.

---

## 6. Verification

Connecte en tant qu'etudiant (token mobile) :

```bash
curl -H "Authorization: Bearer <token>" \
  https://api.votre-domaine.fr/api/v1/student-auth/me/wallet/apple \
  -o carte-accelyo.pkpass
```

- **503** + JSON `Apple Wallet pas encore configure` → la configuration n'est
  pas (encore) complete (variable ou fichier manquant).
- **200** + fichier `application/vnd.apple.pkpass` → ouvrez-le sur un iPhone :
  le passe doit s'ajouter a Apple Wallet.

---

## Icones du passe

Une icone PNG opaque minimale (couleur de marque) est **embarquee** dans le
code (`apple-wallet.service.ts`) et utilisee pour `icon.png`, `icon@2x.png`
et `logo.png`. Elle suffit a la validation d'Apple. Pour un rendu soigne,
vous pourrez remplacer ces images par vos propres assets (logo de
l'etablissement) dans une evolution ulterieure.

---

## Mises a jour automatiques du passe (evolution future)

Le passe genere ici est **statique** : la revocation ou la suspension d'une
carte cote Apple Wallet (passe deja telecharge sur l'iPhone) necessiterait un
**web service de passes** (endpoints `webServiceURL` + push APNs), qui n'est
pas encore implemente.

Dans l'immediat, la **revocation reste pleinement effective** :

- au **scan NFC/QR** (le lecteur verifie le statut de la carte cote serveur) ;
- via **Google Wallet**, dont l'etat du passe est mis a jour en temps reel.

Le passe Apple reste donc un duplicata d'affichage ; la source de verite est
le serveur Accelyo au moment de la validation.
