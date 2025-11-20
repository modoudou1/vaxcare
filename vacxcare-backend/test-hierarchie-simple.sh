#!/bin/bash

# 🧪 TEST SIMPLE DE LA HIÉRARCHIE (sans jq)

API="http://localhost:5000/api"

echo ""
echo "=========================================="
echo "🧪 TEST HIÉRARCHIE VACXCARE"
echo "=========================================="
echo ""

# ============================================================
# ÉTAPE 1 : CONNEXION RÉGIONAL
# ============================================================
echo "📍 ÉTAPE 1 : Connexion Régional Dakar"
echo "Email: modoum469@gmail.com"
echo ""

REGIONAL_LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "modoum469@gmail.com", "password": "password123"}')

echo "Réponse login régional:"
echo "$REGIONAL_LOGIN"
echo ""

REGIONAL_TOKEN=$(echo "$REGIONAL_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$REGIONAL_TOKEN" ]; then
  echo "❌ Échec connexion régional"
  exit 1
fi

echo "✅ Token régional: ${REGIONAL_TOKEN:0:20}..."
echo ""

# ============================================================
# ÉTAPE 2 : CRÉER DISTRICT
# ============================================================
echo "📍 ÉTAPE 2 : Régional crée un District"
echo ""

TIMESTAMP=$(date +%s)
DISTRICT_EMAIL="district_test_${TIMESTAMP}@vacxcare.test"

CREATE_DISTRICT=$(curl -s -X POST "$API/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REGIONAL_TOKEN" \
  -d "{
    \"email\": \"$DISTRICT_EMAIL\",
    \"password\": \"password123\",
    \"role\": \"district\",
    \"region\": \"Dakar\",
    \"healthCenter\": \"Hopital Test District\",
    \"firstName\": \"District\",
    \"lastName\": \"Test\"
  }")

echo "Réponse création district:"
echo "$CREATE_DISTRICT"
echo ""

# Vérifier si "district" apparaît dans la réponse
if echo "$CREATE_DISTRICT" | grep -q '"role":"district"'; then
  echo "✅ District créé avec role: district"
else
  echo "⚠️ Vérifier le rôle du district créé"
fi

echo ""

# ============================================================
# ÉTAPE 3 : CONNEXION DISTRICT
# ============================================================
echo "📍 ÉTAPE 3 : Connexion avec le District"
echo "Email: $DISTRICT_EMAIL"
echo ""

DISTRICT_LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$DISTRICT_EMAIL\",
    \"password\": \"password123\"
  }")

echo "Réponse login district:"
echo "$DISTRICT_LOGIN"
echo ""

DISTRICT_TOKEN=$(echo "$DISTRICT_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$DISTRICT_TOKEN" ]; then
  echo "❌ Échec connexion district"
  exit 1
fi

echo "✅ Token district: ${DISTRICT_TOKEN:0:20}..."
echo ""

# ============================================================
# ÉTAPE 4 : DISTRICT CRÉE AGENT
# ============================================================
echo "📍 ÉTAPE 4 : District crée un Agent"
echo ""

AGENT_EMAIL="agent_test_${TIMESTAMP}@vacxcare.test"

CREATE_AGENT=$(curl -s -X POST "$API/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DISTRICT_TOKEN" \
  -d "{
    \"email\": \"$AGENT_EMAIL\",
    \"password\": \"password123\",
    \"role\": \"agent\",
    \"region\": \"Dakar\",
    \"healthCenter\": \"Case de Sante Test\",
    \"firstName\": \"Agent\",
    \"lastName\": \"Test\",
    \"agentLevel\": \"facility_admin\"
  }")

echo "Réponse création agent:"
echo "$CREATE_AGENT"
echo ""

if echo "$CREATE_AGENT" | grep -q '"role":"agent"'; then
  echo "✅ Agent créé avec role: agent"
else
  echo "⚠️ Vérifier le rôle de l'agent créé"
fi

echo ""

# ============================================================
# ÉTAPE 5 : AGENT CRÉE ENFANT
# ============================================================
echo "📍 ÉTAPE 5 : Agent crée un Enfant"
echo ""

AGENT_LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$AGENT_EMAIL\",
    \"password\": \"password123\"
  }")

AGENT_TOKEN=$(echo "$AGENT_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$AGENT_TOKEN" ]; then
  echo "❌ Échec connexion agent"
  exit 1
fi

echo "✅ Agent connecté"
echo ""

CREATE_CHILD=$(curl -s -X POST "$API/children" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -d "{
    \"firstName\": \"Enfant\",
    \"lastName\": \"Test\",
    \"dateOfBirth\": \"2024-01-15\",
    \"gender\": \"male\",
    \"parentInfo\": {
      \"name\": \"Parent Test\",
      \"phone\": \"+221771234567\"
    }
  }")

echo "Réponse création enfant:"
echo "$CREATE_CHILD"
echo ""

if echo "$CREATE_CHILD" | grep -q '"_id"'; then
  echo "✅ Enfant créé"
else
  echo "❌ Échec création enfant"
fi

echo ""

# ============================================================
# ÉTAPE 6 : DASHBOARD DISTRICT
# ============================================================
echo "📍 ÉTAPE 6 : Dashboard du District"
echo ""

DISTRICT_DASHBOARD=$(curl -s -X GET "$API/dashboard/agent" \
  -H "Authorization: Bearer $DISTRICT_TOKEN")

echo "Réponse dashboard:"
echo "$DISTRICT_DASHBOARD"
echo ""

# Extraire totalChildren
TOTAL_CHILDREN=$(echo "$DISTRICT_DASHBOARD" | grep -o '"totalChildren":[0-9]*' | cut -d':' -f2)

echo "📊 Enfants dans le dashboard: $TOTAL_CHILDREN"
echo ""

if [ "$TOTAL_CHILDREN" -gt "0" ]; then
  echo "✅ Le dashboard fonctionne ! Le district voit les enfants"
else
  echo "⚠️ Le dashboard montre 0 enfants"
fi

echo ""

# ============================================================
# ÉTAPE 7 : LISTE ENFANTS
# ============================================================
echo "📍 ÉTAPE 7 : Liste des Enfants du District"
echo ""

DISTRICT_CHILDREN=$(curl -s -X GET "$API/children" \
  -H "Authorization: Bearer $DISTRICT_TOKEN")

echo "Réponse /api/children (premiers 500 caractères):"
echo "$DISTRICT_CHILDREN" | head -c 500
echo ""
echo ""

if echo "$DISTRICT_CHILDREN" | grep -q '"firstName"'; then
  echo "✅ /api/children retourne des enfants"
else
  echo "⚠️ /api/children ne retourne pas d'enfants"
fi

echo ""
echo "=========================================="
echo "📊 TEST TERMINÉ"
echo "=========================================="
echo ""
