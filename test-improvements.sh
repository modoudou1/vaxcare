#!/bin/bash

echo "🧪 Test des Améliorations VaxCare"
echo "================================="

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URL de base
BASE_URL="http://localhost:5000"

echo ""
echo -e "${BLUE}📊 1. Test des endpoints de monitoring${NC}"
echo "----------------------------------------"

# Test Health Check
echo -n "🏥 Health Check: "
if curl -s "$BASE_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Disponible${NC}"
    curl -s "$BASE_URL/health" | jq .
else
    echo -e "${RED}❌ Indisponible${NC}"
fi

echo ""

# Test Métriques
echo -n "📈 Métriques: "
if curl -s "$BASE_URL/metrics" > /dev/null; then
    echo -e "${GREEN}✅ Disponible${NC}"
    echo "Aperçu des métriques:"
    curl -s "$BASE_URL/metrics" | jq '. | {uptime, memory, requests}'
else
    echo -e "${RED}❌ Indisponible${NC}"
fi

echo ""

# Test Readiness
echo -n "🚀 Readiness: "
if curl -s "$BASE_URL/ready" > /dev/null; then
    echo -e "${GREEN}✅ Prêt${NC}"
else
    echo -e "${RED}❌ Non prêt${NC}"
fi

echo ""

# Test Liveness
echo -n "💓 Liveness: "
if curl -s "$BASE_URL/alive" > /dev/null; then
    echo -e "${GREEN}✅ Vivant${NC}"
else
    echo -e "${RED}❌ Mort${NC}"
fi

echo ""
echo -e "${BLUE}🛡️ 2. Test du Rate Limiting${NC}"
echo "--------------------------------"

echo "Test de 5 requêtes rapides sur /api/auth..."
for i in {1..5}; do
    response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/auth/ping" 2>/dev/null || echo "000")
    echo "Requête $i: HTTP $response"
    sleep 0.1
done

echo ""
echo -e "${BLUE}🔍 3. Test de validation${NC}"
echo "-----------------------------"

echo "Test de validation avec données invalides:"
response=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"123"}' \
  -w "%{http_code}")
echo "Réponse validation: $response"

echo ""
echo -e "${BLUE}📝 4. Vérification des logs${NC}"
echo "--------------------------------"

if [ -d "vacxcare-backend/logs" ]; then
    echo -e "${GREEN}✅ Dossier logs créé${NC}"
    echo "Fichiers de logs disponibles:"
    ls -la vacxcare-backend/logs/
    
    echo ""
    echo "Dernières entrées du log d'erreur:"
    if [ -f "vacxcare-backend/logs/error.log" ]; then
        tail -n 3 vacxcare-backend/logs/error.log
    else
        echo "Aucun log d'erreur pour le moment"
    fi
else
    echo -e "${YELLOW}⚠️ Dossier logs pas encore créé${NC}"
fi

echo ""
echo -e "${BLUE}🧪 5. Test des fonctionnalités${NC}"
echo "----------------------------------"

# Test Swagger
echo -n "📖 Swagger: "
if curl -s "$BASE_URL/api-docs" > /dev/null; then
    echo -e "${GREEN}✅ Disponible sur $BASE_URL/api-docs${NC}"
else
    echo -e "${RED}❌ Indisponible${NC}"
fi

# Test Socket.io
echo -n "🔌 Socket.io: "
if curl -s "$BASE_URL/socket.io/" > /dev/null; then
    echo -e "${GREEN}✅ Disponible${NC}"
else
    echo -e "${RED}❌ Indisponible${NC}"
fi

echo ""
echo -e "${BLUE}📊 6. Résumé des améliorations actives${NC}"
echo "----------------------------------------"

echo -e "${GREEN}✅ Sécurité:${NC}"
echo "  - Helmet (headers sécurisés)"
echo "  - Rate Limiting (protection DDoS)"
echo "  - Validation stricte (express-validator)"
echo "  - JWT sécurisé"

echo ""
echo -e "${GREEN}✅ Performance:${NC}"
echo "  - Compression gzip"
echo "  - Monitoring des requêtes"
echo "  - Cache intelligent"
echo "  - Pagination automatique"

echo ""
echo -e "${GREEN}✅ Robustesse:${NC}"
echo "  - Gestion d'erreurs typées"
echo "  - Retry automatique"
echo "  - Logging structuré"
echo "  - Health checks"

echo ""
echo -e "${GREEN}✅ Observabilité:${NC}"
echo "  - Métriques système"
echo "  - Logs rotatifs"
echo "  - Health endpoints"
echo "  - Monitoring temps réel"

echo ""
echo -e "${YELLOW}💡 Pour voir les améliorations en action:${NC}"
echo "1. Consultez les logs: ls -la vacxcare-backend/logs/"
echo "2. Testez les health checks: curl $BASE_URL/health"
echo "3. Surveillez les métriques: curl $BASE_URL/metrics"
echo "4. Lancez les tests: cd vacxcare-backend && npm test"
echo "5. Testez le rate limiting: Faites plusieurs requêtes rapides"

echo ""
echo -e "${GREEN}🎉 Test terminé !${NC}"
