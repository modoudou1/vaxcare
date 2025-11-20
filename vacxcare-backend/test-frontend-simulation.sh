#!/bin/bash

echo "🧪 SIMULATION FRONTEND - Test avec cookies"
echo "=========================================="
echo ""

API="http://localhost:5000"
DISTRICT_EMAIL="mm4669036@gmail.com"
DISTRICT_PASS="password123"

# Étape 1 : Connexion et récupération du cookie
echo "1️⃣ Connexion..."
RESPONSE=$(curl -s -c cookies.txt -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DISTRICT_EMAIL\",\"password\":\"$DISTRICT_PASS\"}")

echo "$RESPONSE"
echo ""

# Vérifier si la connexion a réussi
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Connexion réussie"
else
    echo "❌ Échec connexion"
    exit 1
fi

echo ""
echo "🍪 Cookie sauvegardé dans cookies.txt"
cat cookies.txt
echo ""

# Étape 2 : Appeler l'API dashboard avec le cookie (comme le frontend)
echo "2️⃣ Dashboard avec cookie (comme le frontend)..."
DASHBOARD=$(curl -s -b cookies.txt "$API/api/dashboard/agent")

echo "$DASHBOARD"
echo ""

# Parser le résultat
TOTAL_CHILDREN=$(echo "$DASHBOARD" | grep -o '"totalChildren":[0-9]*' | cut -d':' -f2)

if [ -z "$TOTAL_CHILDREN" ]; then
    echo "❌ Pas de données reçues - Erreur backend ou cookie invalide"
else
    echo "📊 Total enfants: $TOTAL_CHILDREN"
    
    if [ "$TOTAL_CHILDREN" = "0" ]; then
        echo "❌ PROBLÈME: Dashboard retourne 0 enfant"
    else
        echo "✅ Dashboard retourne des données !"
    fi
fi

echo ""
echo "=========================================="

# Nettoyage
rm -f cookies.txt
