#!/bin/bash

# 🧪 TEST COMPLET DE LA HIÉRARCHIE
# National → Régional → District → Agent
# Vérifie que chaque niveau peut créer le niveau inférieur
# et que les données remontent correctement

set -e  # Arrêter en cas d'erreur

API="http://localhost:5000/api"
COOKIES_DIR="/tmp/vacxcare-cookies"
mkdir -p "$COOKIES_DIR"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "🧪 TEST COMPLET HIÉRARCHIE VACXCARE"
echo "=========================================="
echo ""

# ============================================================
# ÉTAPE 1 : CONNEXION RÉGIONAL DAKAR
# ============================================================
echo -e "${BLUE}📍 ÉTAPE 1 : Connexion Régional Dakar${NC}"
echo "Email: modoum469@gmail.com"
echo ""

REGIONAL_LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -c "$COOKIES_DIR/regional-cookies.txt" \
  -d '{
    "email": "modoum469@gmail.com",
    "password": "password123"
  }')

REGIONAL_TOKEN=$(echo "$REGIONAL_LOGIN" | jq -r '.token // empty')
REGIONAL_ROLE=$(echo "$REGIONAL_LOGIN" | jq -r '.user.role // empty')
REGIONAL_REGION=$(echo "$REGIONAL_LOGIN" | jq -r '.user.region // empty')

if [ -z "$REGIONAL_TOKEN" ]; then
  echo -e "${RED}❌ Échec connexion régional${NC}"
  echo "Réponse: $REGIONAL_LOGIN"
  exit 1
fi

echo -e "${GREEN}✅ Connexion réussie${NC}"
echo "   Rôle: $REGIONAL_ROLE"
echo "   Région: $REGIONAL_REGION"
echo ""

# ============================================================
# ÉTAPE 2 : CRÉER UN NOUVEAU DISTRICT
# ============================================================
echo -e "${BLUE}📍 ÉTAPE 2 : Régional crée un District${NC}"
echo "Création d'un district 'Hopital Test District'..."
echo ""

TIMESTAMP=$(date +%s)
DISTRICT_EMAIL="district_test_${TIMESTAMP}@vacxcare.test"
DISTRICT_HC="Hopital Test District"

CREATE_DISTRICT=$(curl -s -X POST "$API/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REGIONAL_TOKEN" \
  -d "{
    \"email\": \"$DISTRICT_EMAIL\",
    \"password\": \"password123\",
    \"role\": \"district\",
    \"region\": \"$REGIONAL_REGION\",
    \"healthCenter\": \"$DISTRICT_HC\",
    \"firstName\": \"District\",
    \"lastName\": \"Test\"
  }")

DISTRICT_ID=$(echo "$CREATE_DISTRICT" | jq -r '.user._id // .user.id // empty')
DISTRICT_ROLE=$(echo "$CREATE_DISTRICT" | jq -r '.user.role // empty')

if [ -z "$DISTRICT_ID" ]; then
  echo -e "${RED}❌ Échec création district${NC}"
  echo "Réponse: $CREATE_DISTRICT"
  exit 1
fi

echo -e "${GREEN}✅ District créé${NC}"
echo "   Email: $DISTRICT_EMAIL"
echo "   ID: $DISTRICT_ID"
echo "   Rôle: $DISTRICT_ROLE"
echo "   HealthCenter: $DISTRICT_HC"
echo ""

# Vérifier que le rôle est bien "district"
if [ "$DISTRICT_ROLE" != "district" ]; then
  echo -e "${RED}❌ ERREUR: Le district créé a le rôle '$DISTRICT_ROLE' au lieu de 'district'${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Vérification: Le rôle est bien 'district'${NC}"
echo ""

# ============================================================
# ÉTAPE 3 : CONNEXION DISTRICT
# ============================================================
echo -e "${BLUE}📍 ÉTAPE 3 : Connexion avec le District${NC}"
echo "Email: $DISTRICT_EMAIL"
echo ""

DISTRICT_LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -c "$COOKIES_DIR/district-cookies.txt" \
  -d "{
    \"email\": \"$DISTRICT_EMAIL\",
    \"password\": \"password123\"
  }")

DISTRICT_TOKEN=$(echo "$DISTRICT_LOGIN" | jq -r '.token // empty')
DISTRICT_LOGIN_ROLE=$(echo "$DISTRICT_LOGIN" | jq -r '.user.role // empty')

if [ -z "$DISTRICT_TOKEN" ]; then
  echo -e "${RED}❌ Échec connexion district${NC}"
  echo "Réponse: $DISTRICT_LOGIN"
  exit 1
fi

echo -e "${GREEN}✅ Connexion réussie${NC}"
echo "   Rôle après login: $DISTRICT_LOGIN_ROLE"
echo ""

# ============================================================
# ÉTAPE 4 : DISTRICT CRÉE UN AGENT
# ============================================================
echo -e "${BLUE}📍 ÉTAPE 4 : District crée un Agent (Acteur de santé)${NC}"
echo "Création d'un agent 'Case de Santé Test'..."
echo ""

AGENT_EMAIL="agent_test_${TIMESTAMP}@vacxcare.test"
AGENT_HC="Case de Sante Test"

CREATE_AGENT=$(curl -s -X POST "$API/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DISTRICT_TOKEN" \
  -d "{
    \"email\": \"$AGENT_EMAIL\",
    \"password\": \"password123\",
    \"role\": \"agent\",
    \"region\": \"$REGIONAL_REGION\",
    \"healthCenter\": \"$AGENT_HC\",
    \"firstName\": \"Agent\",
    \"lastName\": \"Test\",
    \"agentLevel\": \"facility_admin\"
  }")

AGENT_ID=$(echo "$CREATE_AGENT" | jq -r '.user._id // .user.id // empty')
AGENT_ROLE=$(echo "$CREATE_AGENT" | jq -r '.user.role // empty')

if [ -z "$AGENT_ID" ]; then
  echo -e "${RED}❌ Échec création agent${NC}"
  echo "Réponse: $CREATE_AGENT"
  exit 1
fi

echo -e "${GREEN}✅ Agent créé${NC}"
echo "   Email: $AGENT_EMAIL"
echo "   ID: $AGENT_ID"
echo "   Rôle: $AGENT_ROLE"
echo "   HealthCenter: $AGENT_HC"
echo ""

# Vérifier que le rôle est bien "agent"
if [ "$AGENT_ROLE" != "agent" ]; then
  echo -e "${RED}❌ ERREUR: L'agent créé a le rôle '$AGENT_ROLE' au lieu de 'agent'${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Vérification: Le rôle est bien 'agent'${NC}"
echo ""

# ============================================================
# ÉTAPE 5 : AGENT CRÉE UN ENFANT
# ============================================================
echo -e "${BLUE}📍 ÉTAPE 5 : Agent crée un Enfant${NC}"
echo "Connexion avec l'agent..."
echo ""

AGENT_LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -c "$COOKIES_DIR/agent-cookies.txt" \
  -d "{
    \"email\": \"$AGENT_EMAIL\",
    \"password\": \"password123\"
  }")

AGENT_TOKEN=$(echo "$AGENT_LOGIN" | jq -r '.token // empty')

if [ -z "$AGENT_TOKEN" ]; then
  echo -e "${RED}❌ Échec connexion agent${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Agent connecté${NC}"
echo ""

echo "Création d'un enfant..."

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

CHILD_ID=$(echo "$CREATE_CHILD" | jq -r '._id // .id // empty')
CHILD_DISTRICT=$(echo "$CREATE_CHILD" | jq -r '.district // empty')

if [ -z "$CHILD_ID" ]; then
  echo -e "${RED}❌ Échec création enfant${NC}"
  echo "Réponse: $CREATE_CHILD"
  exit 1
fi

echo -e "${GREEN}✅ Enfant créé${NC}"
echo "   ID: $CHILD_ID"
echo "   District: $CHILD_DISTRICT"
echo "   HealthCenter: $(echo "$CREATE_CHILD" | jq -r '.healthCenter // empty')"
echo ""

# ============================================================
# ÉTAPE 6 : VÉRIFIER DASHBOARD DISTRICT
# ============================================================
echo -e "${BLUE}📍 ÉTAPE 6 : Vérifier Dashboard du District${NC}"
echo "Le district doit voir l'enfant créé par son agent..."
echo ""

DISTRICT_DASHBOARD=$(curl -s -X GET "$API/dashboard/agent" \
  -H "Authorization: Bearer $DISTRICT_TOKEN" \
  -b "$COOKIES_DIR/district-cookies.txt")

TOTAL_CHILDREN=$(echo "$DISTRICT_DASHBOARD" | jq -r '.totalChildren // 0')
VACCINATIONS=$(echo "$DISTRICT_DASHBOARD" | jq -r '.vaccinationsSaisies // 0')

echo -e "${GREEN}📊 DASHBOARD DISTRICT:${NC}"
echo "   Enfants suivis: $TOTAL_CHILDREN"
echo "   Vaccinations saisies: $VACCINATIONS"
echo ""

if [ "$TOTAL_CHILDREN" -eq "0" ]; then
  echo -e "${RED}❌ PROBLÈME: Le dashboard du district montre 0 enfants${NC}"
  echo "   L'enfant créé par l'agent devrait être visible !"
  echo ""
  echo "Réponse complète:"
  echo "$DISTRICT_DASHBOARD" | jq '.'
else
  echo -e "${GREEN}✅ Le dashboard fonctionne ! Le district voit les enfants de ses agents${NC}"
fi

echo ""

# ============================================================
# ÉTAPE 7 : VÉRIFIER LISTE DES ENFANTS
# ============================================================
echo -e "${BLUE}📍 ÉTAPE 7 : Vérifier Liste des Enfants du District${NC}"
echo ""

DISTRICT_CHILDREN=$(curl -s -X GET "$API/children" \
  -H "Authorization: Bearer $DISTRICT_TOKEN" \
  -b "$COOKIES_DIR/district-cookies.txt")

CHILDREN_COUNT=$(echo "$DISTRICT_CHILDREN" | jq '. | length')

echo "   Nombre d'enfants retournés: $CHILDREN_COUNT"
echo ""

if [ "$CHILDREN_COUNT" -eq "0" ]; then
  echo -e "${RED}❌ PROBLÈME: /api/children retourne 0 enfants pour le district${NC}"
else
  echo -e "${GREEN}✅ /api/children fonctionne ! Le district voit ses enfants${NC}"
  echo ""
  echo "Détails des enfants:"
  echo "$DISTRICT_CHILDREN" | jq '.[] | {firstName, lastName, healthCenter, district}'
fi

echo ""

# ============================================================
# RÉSUMÉ FINAL
# ============================================================
echo ""
echo "=========================================="
echo "📊 RÉSUMÉ DU TEST"
echo "=========================================="
echo ""
echo -e "${GREEN}✅ Régional Dakar${NC}: Connecté ($REGIONAL_REGION)"
echo -e "${GREEN}✅ District créé${NC}: $DISTRICT_EMAIL (role: $DISTRICT_ROLE)"
echo -e "${GREEN}✅ Agent créé${NC}: $AGENT_EMAIL (role: $AGENT_ROLE)"
echo -e "${GREEN}✅ Enfant créé${NC}: ID $CHILD_ID"
echo ""
echo -e "${YELLOW}📊 Dashboard District:${NC} $TOTAL_CHILDREN enfants"
echo -e "${YELLOW}📋 Liste Enfants:${NC} $CHILDREN_COUNT enfants"
echo ""

if [ "$TOTAL_CHILDREN" -gt "0" ] && [ "$CHILDREN_COUNT" -gt "0" ]; then
  echo -e "${GREEN}🎉 TEST RÉUSSI ! La hiérarchie fonctionne parfaitement !${NC}"
  echo ""
  echo "✅ Régional → peut créer District"
  echo "✅ District → peut créer Agent"
  echo "✅ Agent → peut créer Enfant"
  echo "✅ District → voit les enfants de ses agents"
else
  echo -e "${RED}⚠️ TEST PARTIELLEMENT RÉUSSI${NC}"
  echo ""
  echo "✅ Création de la hiérarchie fonctionne"
  echo "❌ Le dashboard district ne montre pas les données"
  echo ""
  echo "💡 Vérifie les logs backend pour plus d'infos"
fi

echo ""
echo "=========================================="
echo ""
