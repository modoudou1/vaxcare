#!/bin/bash

# 🧪 Script de test CURL complet pour diagnostiquer le problème d'agrégation district

echo "================================================================================================"
echo "🧪 TESTS CURL COMPLETS - DIAGNOSTIC DISTRICT"
echo "================================================================================================"
echo ""

API_BASE="http://localhost:5000"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables pour les credentials
# 🔴 Compte district trouvé en base
DISTRICT_EMAIL="mm4669036@gmail.com"
DISTRICT_PASSWORD="password"  # Mot de passe par défaut - à ajuster si nécessaire

# Compte de la case de santé (fallback)
CASE_EMAIL="aminagueyesene@gmail.com"
CASE_PASSWORD="password"  # Mot de passe par défaut - à ajuster si nécessaire

echo "📝 Configuration:"
echo "   - API: $API_BASE"
echo "   - Email district: $DISTRICT_EMAIL"
echo "   - Email case: $CASE_EMAIL"
echo ""

# ====================================================================================
# TEST 0: Vérifier que le serveur backend est accessible
# ====================================================================================
echo "================================================================================================"
echo "🔍 TEST 0: Vérifier que le serveur backend est accessible"
echo "================================================================================================"

HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/health" 2>/dev/null)

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✅ Serveur backend accessible${NC}"
else
    echo -e "${RED}❌ Serveur backend inaccessible (code: $HEALTH_CHECK)${NC}"
    echo -e "${YELLOW}💡 Lance le serveur avec: cd /Users/macretina/Vacxcare/vacxcare-backend && npm run dev${NC}"
    exit 1
fi

echo ""

# ====================================================================================
# TEST 1: Connexion avec le compte district
# ====================================================================================
echo "================================================================================================"
echo "🔐 TEST 1: Connexion avec le compte DISTRICT"
echo "================================================================================================"

LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DISTRICT_EMAIL\",\"password\":\"$DISTRICT_PASSWORD\"}")

echo "📡 Réponse brute:"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

# Extraire le token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}❌ Échec de connexion avec le compte district${NC}"
    echo -e "${YELLOW}💡 Essai avec le compte de la case de santé...${NC}"
    echo ""
    
    # Essayer avec le compte de la case de santé
    LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$CASE_EMAIL\",\"password\":\"$CASE_PASSWORD\"}")
    
    echo "📡 Réponse brute (case de santé):"
    echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
    echo ""
    
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty' 2>/dev/null)
    
    if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
        echo -e "${RED}❌ Échec de connexion avec la case de santé aussi${NC}"
        echo -e "${YELLOW}💡 Vérifie les credentials dans le script${NC}"
        exit 1
    fi
    
    USER_EMAIL="$CASE_EMAIL"
    echo -e "${GREEN}✅ Connexion réussie avec le compte case de santé${NC}"
else
    USER_EMAIL="$DISTRICT_EMAIL"
    echo -e "${GREEN}✅ Connexion réussie avec le compte district${NC}"
fi

# Afficher les infos utilisateur
USER_ROLE=$(echo "$LOGIN_RESPONSE" | jq -r '.user.role // empty')
USER_AGENT_LEVEL=$(echo "$LOGIN_RESPONSE" | jq -r '.user.agentLevel // empty')
USER_HEALTH_CENTER=$(echo "$LOGIN_RESPONSE" | jq -r '.user.healthCenter // empty')
USER_REGION=$(echo "$LOGIN_RESPONSE" | jq -r '.user.region // empty')

echo ""
echo "👤 Utilisateur connecté:"
echo "   - Email: $USER_EMAIL"
echo "   - Role: $USER_ROLE"
echo "   - Agent Level: $USER_AGENT_LEVEL"
echo "   - Health Center: $USER_HEALTH_CENTER"
echo "   - Region: $USER_REGION"
echo "   - Token: ${TOKEN:0:30}..."
echo ""

# ====================================================================================
# TEST 2: API Dashboard Agent
# ====================================================================================
echo "================================================================================================"
echo "📊 TEST 2: API Dashboard Agent"
echo "================================================================================================"

DASHBOARD_RESPONSE=$(curl -s -X GET "$API_BASE/api/dashboard/agent" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "📡 Réponse brute:"
echo "$DASHBOARD_RESPONSE" | jq '.' 2>/dev/null || echo "$DASHBOARD_RESPONSE"
echo ""

TOTAL_CHILDREN=$(echo "$DASHBOARD_RESPONSE" | jq -r '.totalChildren // 0')
TOTAL_VACCINATIONS=$(echo "$DASHBOARD_RESPONSE" | jq -r '.vaccinationsSaisies // 0')
APPOINTMENTS_TODAY=$(echo "$DASHBOARD_RESPONSE" | jq -r '.appointmentsToday // 0')

echo "📊 Résumé:"
echo "   - Total enfants: $TOTAL_CHILDREN"
echo "   - Vaccinations: $TOTAL_VACCINATIONS"
echo "   - RDV aujourd'hui: $APPOINTMENTS_TODAY"
echo ""

if [ "$TOTAL_CHILDREN" = "0" ]; then
    echo -e "${RED}❌ PROBLÈME: Le dashboard montre 0 enfant !${NC}"
else
    echo -e "${GREEN}✅ Le dashboard montre des enfants${NC}"
fi

echo ""

# ====================================================================================
# TEST 3: API Liste des enfants
# ====================================================================================
echo "================================================================================================"
echo "👶 TEST 3: API Liste des enfants"
echo "================================================================================================"

CHILDREN_RESPONSE=$(curl -s -X GET "$API_BASE/api/children" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "📡 Réponse brute:"
echo "$CHILDREN_RESPONSE" | jq '.' 2>/dev/null || echo "$CHILDREN_RESPONSE"
echo ""

# Compter les enfants (la réponse peut être un array ou {children: []}
CHILDREN_COUNT=$(echo "$CHILDREN_RESPONSE" | jq 'if type=="array" then length else (.children // []) | length end' 2>/dev/null || echo "0")

echo "📊 Résumé:"
echo "   - Nombre d'enfants: $CHILDREN_COUNT"
echo ""

if [ "$CHILDREN_COUNT" = "0" ]; then
    echo -e "${RED}❌ PROBLÈME: Aucun enfant retourné !${NC}"
else
    echo -e "${GREEN}✅ Enfants trouvés:${NC}"
    # Afficher les noms et districts des 5 premiers enfants
    echo "$CHILDREN_RESPONSE" | jq -r '
        if type=="array" then . else (.children // []) end | 
        .[:5] | 
        .[] | 
        "   - \(.name // (.firstName + " " + .lastName)): healthCenter=\(.healthCenter // "N/A"), district=\(.district // "MANQUANT")"
    ' 2>/dev/null || echo "   (Impossible d'afficher les détails)"
fi

echo ""

# ====================================================================================
# TEST 4: API Liste des vaccinations
# ====================================================================================
echo "================================================================================================"
echo "💉 TEST 4: API Liste des vaccinations"
echo "================================================================================================"

VACCINATIONS_RESPONSE=$(curl -s -X GET "$API_BASE/api/vaccinations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "📡 Réponse brute (premiers 1000 caractères):"
echo "$VACCINATIONS_RESPONSE" | cut -c1-1000 | jq '.' 2>/dev/null || echo "$VACCINATIONS_RESPONSE" | cut -c1-1000
echo ""

VACCINATIONS_COUNT=$(echo "$VACCINATIONS_RESPONSE" | jq 'length' 2>/dev/null || echo "0")

echo "📊 Résumé:"
echo "   - Nombre de vaccinations: $VACCINATIONS_COUNT"
echo ""

if [ "$VACCINATIONS_COUNT" = "0" ]; then
    echo -e "${YELLOW}⚠️  Aucune vaccination trouvée${NC}"
else
    echo -e "${GREEN}✅ Vaccinations trouvées (5 premières):${NC}"
    echo "$VACCINATIONS_RESPONSE" | jq -r '
        .[:5] | 
        .[] | 
        "   - \(.vaccine.name // "N/A"): healthCenter=\(.healthCenter // "N/A"), district=\(.district // "MANQUANT"), status=\(.status)"
    ' 2>/dev/null || echo "   (Impossible d'afficher les détails)"
fi

echo ""

# ====================================================================================
# TEST 5: API Stats District (si compte district)
# ====================================================================================
if [ "$USER_AGENT_LEVEL" = "district" ]; then
    echo "================================================================================================"
    echo "📈 TEST 5: API Stats District"
    echo "================================================================================================"
    
    STATS_RESPONSE=$(curl -s -X GET "$API_BASE/api/stats/district" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json")
    
    echo "📡 Réponse brute:"
    echo "$STATS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATS_RESPONSE"
    echo ""
fi

# ====================================================================================
# TEST 6: Vérifier directement en base de données
# ====================================================================================
echo "================================================================================================"
echo "🗄️  TEST 6: Vérification base de données (via script séparé)"
echo "================================================================================================"

echo "Exécution du test d'agrégation..."
echo ""

cd /Users/macretina/Vacxcare/vacxcare-backend
node test-district-aggregation.js 2>&1 | tail -n 50

echo ""

# ====================================================================================
# RÉSUMÉ FINAL
# ====================================================================================
echo "================================================================================================"
echo "📊 RÉSUMÉ FINAL"
echo "================================================================================================"
echo ""

echo "🔐 Connexion:"
if [ -n "$TOKEN" ]; then
    echo -e "   ${GREEN}✅ Authentification réussie${NC}"
    echo "   - Utilisateur: $USER_EMAIL"
    echo "   - Centre: $USER_HEALTH_CENTER"
else
    echo -e "   ${RED}❌ Échec d'authentification${NC}"
fi

echo ""
echo "📊 Dashboard Agent:"
if [ "$TOTAL_CHILDREN" = "0" ]; then
    echo -e "   ${RED}❌ Montre 0 enfant (PROBLÈME)${NC}"
else
    echo -e "   ${GREEN}✅ Montre $TOTAL_CHILDREN enfant(s)${NC}"
fi

echo ""
echo "👶 Liste Enfants:"
if [ "$CHILDREN_COUNT" = "0" ]; then
    echo -e "   ${RED}❌ Aucun enfant retourné (PROBLÈME)${NC}"
else
    echo -e "   ${GREEN}✅ $CHILDREN_COUNT enfant(s) retourné(s)${NC}"
fi

echo ""
echo "💉 Liste Vaccinations:"
if [ "$VACCINATIONS_COUNT" = "0" ]; then
    echo -e "   ${YELLOW}⚠️  Aucune vaccination${NC}"
else
    echo -e "   ${GREEN}✅ $VACCINATIONS_COUNT vaccination(s)${NC}"
fi

echo ""
echo "================================================================================================"

if [ "$TOTAL_CHILDREN" = "0" ] || [ "$CHILDREN_COUNT" = "0" ]; then
    echo -e "${RED}❌ DIAGNOSTIC: Le problème persiste${NC}"
    echo ""
    echo "💡 Prochaines étapes:"
    echo "   1. Vérifie les logs du serveur backend"
    echo "   2. Vérifie la section 'TEST 6' ci-dessus pour voir les données en base"
    echo "   3. Si les données en base sont OK mais l'API retourne 0, il y a un problème dans le code backend"
    echo "   4. Si les données en base sont vides, exécute: node fix-district-data.js"
else
    echo -e "${GREEN}✅ SUCCÈS: Les APIs retournent des données${NC}"
    echo ""
    echo "💡 Si le frontend montre toujours 0:"
    echo "   1. Vérifie que le frontend est lancé"
    echo "   2. Vérifie la console du navigateur pour les erreurs"
    echo "   3. Vérifie que le frontend utilise le bon port (5000)"
fi

echo "================================================================================================"
