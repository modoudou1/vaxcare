#!/bin/bash

# 🧪 TEST COMPLET HIÉRARCHIE AVEC CURL

set -e

API="http://localhost:5000/api"
COOKIES_DIR="/tmp/vacxcare-test-cookies"
mkdir -p "$COOKIES_DIR"

echo ""
echo "=========================================="
echo "🧪 TEST COMPLET HIÉRARCHIE"
echo "=========================================="
echo ""

# ============================================================
# ÉTAPE 1 : CONNEXION RÉGIONAL DAKAR
# ============================================================
echo "📍 ÉTAPE 1 : Connexion Régional Dakar"
echo ""

REGIONAL_RESPONSE=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -c "$COOKIES_DIR/regional-cookies.txt" \
  -d '{
    "email": "modoum469@gmail.com",
    "password": "password123"
  }')

echo "Réponse login régional:"
echo "$REGIONAL_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REGIONAL_RESPONSE"
echo ""

REGIONAL_TOKEN=$(echo "$REGIONAL_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

if [ -z "$REGIONAL_TOKEN" ]; then
  echo "❌ Échec connexion régional"
  exit 1
fi

echo "✅ Token régional obtenu"
echo ""

# ============================================================
# ÉTAPE 2 : CRÉER UN DISTRICT
# ============================================================
echo "📍 ÉTAPE 2 : Régional crée un District"
echo ""

TIMESTAMP=$(date +%s)
DISTRICT_EMAIL="district_curl_${TIMESTAMP}@test.com"

echo "Données envoyées :"
cat <<EOF
{
  "email": "$DISTRICT_EMAIL",
  "password": "password123",
  "role": "district",
  "region": "Dakar",
  "healthCenter": "District hopital Medina",
  "firstName": "District",
  "lastName": "CurlTest"
}
EOF
echo ""

CREATE_DISTRICT=$(curl -s -X POST "$API/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REGIONAL_TOKEN" \
  -b "$COOKIES_DIR/regional-cookies.txt" \
  -d "{
    \"email\": \"$DISTRICT_EMAIL\",
    \"password\": \"password123\",
    \"role\": \"district\",
    \"region\": \"Dakar\",
    \"healthCenter\": \"District hopital Medina\",
    \"firstName\": \"District\",
    \"lastName\": \"CurlTest\"
  }")

echo "Réponse création district:"
echo "$CREATE_DISTRICT" | python3 -m json.tool 2>/dev/null || echo "$CREATE_DISTRICT"
echo ""

# Vérifier si erreur
if echo "$CREATE_DISTRICT" | grep -q '"error"'; then
  echo "❌ ERREUR lors de la création du district"
  echo "Le backend a retourné une erreur."
  exit 1
fi

DISTRICT_ID=$(echo "$CREATE_DISTRICT" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['user'].get('_id') or data['user'].get('id'))" 2>/dev/null || echo "")

if [ -z "$DISTRICT_ID" ]; then
  echo "❌ Impossible d'extraire l'ID du district"
  exit 1
fi

echo "✅ District créé avec succès"
echo "   ID: $DISTRICT_ID"
echo "   Email: $DISTRICT_EMAIL"
echo ""

# ============================================================
# ÉTAPE 3 : CONNEXION DISTRICT
# ============================================================
echo "📍 ÉTAPE 3 : Connexion avec le District créé"
echo ""

DISTRICT_LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -c "$COOKIES_DIR/district-cookies.txt" \
  -d "{
    \"email\": \"$DISTRICT_EMAIL\",
    \"password\": \"password123\"
  }")

echo "Réponse login district:"
echo "$DISTRICT_LOGIN" | python3 -m json.tool 2>/dev/null || echo "$DISTRICT_LOGIN"
echo ""

DISTRICT_TOKEN=$(echo "$DISTRICT_LOGIN" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
DISTRICT_ROLE=$(echo "$DISTRICT_LOGIN" | python3 -c "import sys, json; print(json.load(sys.stdin)['user']['role'])" 2>/dev/null)

if [ -z "$DISTRICT_TOKEN" ]; then
  echo "❌ Échec connexion district"
  exit 1
fi

echo "✅ District connecté"
echo "   Rôle: $DISTRICT_ROLE"
echo ""

if [ "$DISTRICT_ROLE" != "district" ]; then
  echo "⚠️ ATTENTION: Le rôle est '$DISTRICT_ROLE' au lieu de 'district'"
fi

echo ""

# ============================================================
# ÉTAPE 4 : DISTRICT CRÉE UN AGENT
# ============================================================
echo "📍 ÉTAPE 4 : District crée un Agent"
echo ""

AGENT_EMAIL="agent_curl_${TIMESTAMP}@test.com"

echo "Données envoyées :"
cat <<EOF
{
  "email": "$AGENT_EMAIL",
  "password": "password123",
  "role": "agent",
  "region": "Dakar",
  "healthCenter": "Centre de sante medina",
  "firstName": "Agent",
  "lastName": "CurlTest"
}
EOF
echo ""

CREATE_AGENT=$(curl -s -X POST "$API/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DISTRICT_TOKEN" \
  -b "$COOKIES_DIR/district-cookies.txt" \
  -d "{
    \"email\": \"$AGENT_EMAIL\",
    \"password\": \"password123\",
    \"role\": \"agent\",
    \"region\": \"Dakar\",
    \"healthCenter\": \"Centre de sante medina\",
    \"firstName\": \"Agent\",
    \"lastName\": \"CurlTest\"
  }")

echo "Réponse création agent:"
echo "$CREATE_AGENT" | python3 -m json.tool 2>/dev/null || echo "$CREATE_AGENT"
echo ""

# Vérifier si erreur
if echo "$CREATE_AGENT" | grep -q '"error"'; then
  echo "❌ ERREUR lors de la création de l'agent"
  echo "Le backend a retourné une erreur."
  exit 1
fi

AGENT_ID=$(echo "$CREATE_AGENT" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['user'].get('_id') or data['user'].get('id'))" 2>/dev/null || echo "")

if [ -z "$AGENT_ID" ]; then
  echo "❌ Impossible d'extraire l'ID de l'agent"
  exit 1
fi

echo "✅ Agent créé avec succès"
echo "   ID: $AGENT_ID"
echo "   Email: $AGENT_EMAIL"
echo ""

# ============================================================
# ÉTAPE 5 : DASHBOARD DISTRICT
# ============================================================
echo "📍 ÉTAPE 5 : Vérifier Dashboard du District"
echo ""

DASHBOARD=$(curl -s -X GET "$API/dashboard/agent" \
  -H "Authorization: Bearer $DISTRICT_TOKEN" \
  -b "$COOKIES_DIR/district-cookies.txt")

echo "Réponse dashboard:"
echo "$DASHBOARD" | python3 -m json.tool 2>/dev/null || echo "$DASHBOARD"
echo ""

TOTAL_CHILDREN=$(echo "$DASHBOARD" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalChildren', 0))" 2>/dev/null || echo "0")

echo "📊 Dashboard District:"
echo "   Enfants: $TOTAL_CHILDREN"
echo ""

# ============================================================
# RÉSUMÉ
# ============================================================
echo ""
echo "=========================================="
echo "📊 RÉSUMÉ DU TEST"
echo "=========================================="
echo ""
echo "✅ Régional: Connecté (Dakar)"
echo "✅ District: Créé ($DISTRICT_EMAIL)"
echo "✅ District: Connecté (role: $DISTRICT_ROLE)"
echo "✅ Agent: Créé ($AGENT_EMAIL)"
echo "📊 Dashboard: $TOTAL_CHILDREN enfants"
echo ""
echo "🎉 TEST COMPLET RÉUSSI !"
echo ""
echo "=========================================="
echo ""
