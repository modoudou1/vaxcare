#!/bin/bash

# 🧪 Script de test automatique pour les rappels de vaccination

echo "🔔 Test du système de rappels de vaccination"
echo "=============================================="
echo ""

# Couleurs pour le terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# URL du serveur
BASE_URL="http://localhost:5000"

echo -e "${BLUE}📡 Vérification que le serveur est démarré...${NC}"
if curl -s "$BASE_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Serveur actif sur $BASE_URL${NC}"
else
    echo -e "${RED}❌ Serveur non accessible sur $BASE_URL${NC}"
    echo -e "${YELLOW}💡 Démarrez le serveur avec : cd vacxcare-backend && npm run dev${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🧪 Lancement du test des rappels de vaccination...${NC}"
echo ""

# Appeler l'endpoint de test
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/test/vaccination-reminders")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Test réussi ! (Code HTTP: $HTTP_CODE)${NC}"
    echo ""
    echo -e "${BLUE}📝 Réponse du serveur :${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Erreur lors du test (Code HTTP: $HTTP_CODE)${NC}"
    echo ""
    echo -e "${BLUE}📝 Réponse du serveur :${NC}"
    echo "$BODY"
    exit 1
fi

echo ""
echo -e "${YELLOW}📋 Vérifications à effectuer :${NC}"
echo "1. Consultez les logs du serveur backend"
echo "2. Vérifiez les notifications dans la base de données :"
echo "   db.notifications.find({ 'metadata.reminderType': 'vaccination_reminder' }).sort({ createdAt: -1 })"
echo "3. Ouvrez l'application mobile pour voir les notifications en temps réel"
echo "4. Vérifiez le téléphone du parent pour les SMS/WhatsApp"
echo ""
echo -e "${GREEN}🎉 Test terminé !${NC}"
