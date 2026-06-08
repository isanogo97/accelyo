#!/usr/bin/env bash
# =================================================================
# Test fonctionnel de bout en bout sur une instance Accelyo en prod.
# Usage: bash infra/scripts/smoke-test.sh <BASE_URL> <SUPERADMIN_EMAIL> <SUPERADMIN_PASSWORD>
# Exemple: bash infra/scripts/smoke-test.sh http://localhost:3000 admin@accelyo.fr 'MotDePasse!'
# Rejoue: univ -> admin -> etudiant -> carte -> lecteur -> validation NFC -> stats
# =================================================================
BASE="${1:-http://localhost:3000}"
EMAIL="${2:?email super-admin requis}"
PWD_SA="${3:?mot de passe super-admin requis}"
API="$BASE/api/v1"
DOM="demo-$RANDOM.fr"

jval(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)"; }
step(){ echo; echo "=== $* ==="; }

step "1) Login super-admin"
TOK=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PWD_SA\"}" | jval "['data']['tokens']['accessToken']")
echo "OK token: ${TOK:0:16}..."

step "2) Creer une universite"
UID=$(curl -s -X POST "$API/universities" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Universite Demo\",\"domain\":\"$DOM\",\"deploymentMode\":\"CLOUD\"}" | jval "['data']['id']")
echo "OK universite: $UID ($DOM)"

step "3) Creer un admin d'universite"
ADM=$(curl -s -X POST "$API/universities/$UID/admins" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
  -d "{\"email\":\"admin-$DOM\",\"role\":\"UNIVERSITY_ADMIN\"}")
ADMPWD=$(echo "$ADM" | jval "['data']['temporaryPassword']")
echo "OK admin: admin-$DOM / $ADMPWD"

step "4) Login admin universite"
ATOK=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"admin-$DOM\",\"password\":\"$ADMPWD\"}" | jval "['data']['tokens']['accessToken']")
echo "OK token admin: ${ATOK:0:16}..."

step "5) Creer un etudiant"
SID=$(curl -s -X POST "$API/students" -H "Authorization: Bearer $ATOK" -H 'Content-Type: application/json' \
  -d "{\"firstName\":\"Jean\",\"lastName\":\"Dupont\",\"studentNumber\":\"ETU12345\",\"email\":\"jean@$DOM\",\"universityId\":\"$UID\",\"enrollmentYear\":2025}" | jval "['data']['id']")
echo "OK etudiant: $SID"

step "6) Emettre une carte"
CARD=$(curl -s -X POST "$API/cards/issue/$SID" -H "Authorization: Bearer $ATOK" -H 'Content-Type: application/json' -d '{}')
CUID=$(echo "$CARD" | jval "['data']['cardUid']")
echo "OK carte emise, UID Mifare: $CUID"

step "7) Enregistrer un lecteur NFC (Elatec)"
APIKEY=$(curl -s -X POST "$API/nfc/readers" -H "Authorization: Bearer $ATOK" -H 'Content-Type: application/json' \
  -d '{"reader_id":"READER-DEMO-1","label":"Porte A","location":"Hall"}' | jval "['data']['apiKey']")
echo "OK lecteur enregistre, apiKey: ${APIKEY:0:16}..."

step "8) VALIDATION NFC (lecteur presente la carte) -> doit etre GRANTED"
TS=$(python3 -c "import time;print(int(time.time()*1000))")
NONCE=$(openssl rand -hex 16)
MSG="READER-DEMO-1|Hall|$CUID|$TS|$NONCE"
SIG=$(printf '%s' "$MSG" | openssl dgst -sha256 -hmac "$APIKEY" | sed 's/^.*= //')
curl -s -X POST "$API/nfc/validate" -H 'Content-Type: application/json' \
  -d "{\"reader_id\":\"READER-DEMO-1\",\"reader_location\":\"Hall\",\"card_uid\":\"$CUID\",\"timestamp\":$TS,\"nonce\":\"$NONCE\",\"signature\":\"$SIG\"}"
echo

step "9) Re-validation avec le MEME nonce -> doit etre DENIED (anti-replay)"
curl -s -X POST "$API/nfc/validate" -H 'Content-Type: application/json' \
  -d "{\"reader_id\":\"READER-DEMO-1\",\"reader_location\":\"Hall\",\"card_uid\":\"$CUID\",\"timestamp\":$TS,\"nonce\":\"$NONCE\",\"signature\":\"$SIG\"}"
echo

step "10) Stats de l'universite (1 etudiant, 1 carte active)"
curl -s "$API/universities/$UID/stats" -H "Authorization: Bearer $ATOK"; echo
echo; echo "=== FIN DU TEST ==="
