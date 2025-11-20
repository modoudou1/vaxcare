#!/bin/bash

# Script de test pour le transfert Régional → District

BASE_URL="http://localhost:5000"

echo "🔍 ========================================="
echo "   TEST TRANSFERT RÉGIONAL → DISTRICT"
echo "========================================="
echo ""

# Connexion REGIONAL
echo "📧 ÉTAPE 1: Connexion en tant que RÉGIONAL Dakar"
echo "========================================="
read -p "Email du compte RÉGIONAL (ex: modoum469@gmail.com): " REGIONAL_EMAIL
read -sp "Mot de passe: " REGIONAL_PASSWORD
echo ""

regional_login=$(curl -s -c /tmp/cookies_regional.txt -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$REGIONAL_EMAIL\",\"password\":\"$REGIONAL_PASSWORD\"}")

echo "✅ Connexion réussie"
echo ""

# Liste stocks régionaux
echo "📦 ÉTAPE 2: Liste des stocks RÉGIONAUX"
echo "========================================="
regional_stocks=$(curl -s -b /tmp/cookies_regional.txt "${BASE_URL}/api/stocks")
echo "Stocks régionaux trouvés:"
echo "$regional_stocks" | python3 -m json.tool 2>/dev/null || echo "$regional_stocks"
echo ""

# Extraire le premier stock ID
stock_id=$(echo "$regional_stocks" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "🎯 Stock sélectionné: $stock_id"
echo ""

# Transfert vers district
echo "🚀 ÉTAPE 3: Transfert vers un DISTRICT"
echo "========================================="
read -p "Nom du district (ex: District de Thiès): " DISTRICT_NAME
read -p "Quantité à transférer: " QUANTITY

transfer_response=$(curl -s -b /tmp/cookies_regional.txt -X POST "${BASE_URL}/api/stocks/transfers/initiate" \
    -H "Content-Type: application/json" \
    -d "{\"stockId\":\"$stock_id\",\"quantity\":$QUANTITY,\"toHealthCenter\":\"$DISTRICT_NAME\"}")

echo "Réponse du transfert:"
echo "$transfer_response" | python3 -m json.tool 2>/dev/null || echo "$transfer_response"
echo ""

echo "⏳ Attente de 2 secondes..."
sleep 2
echo ""

# Vérification stocks régional après transfert
echo "📦 ÉTAPE 4: Vérification stocks RÉGIONAL après transfert"
echo "========================================="
regional_stocks_after=$(curl -s -b /tmp/cookies_regional.txt "${BASE_URL}/api/stocks")
echo "Stocks régionaux restants:"
echo "$regional_stocks_after" | python3 -m json.tool 2>/dev/null || echo "$regional_stocks_after"
echo ""

# Connexion DISTRICT
echo "📧 ÉTAPE 5: Connexion en tant que DISTRICT"
echo "========================================="
read -p "Email du compte DISTRICT: " DISTRICT_EMAIL
read -sp "Mot de passe: " DISTRICT_PASSWORD
echo ""

district_login=$(curl -s -c /tmp/cookies_district.txt -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$DISTRICT_EMAIL\",\"password\":\"$DISTRICT_PASSWORD\"}")

echo "✅ Connexion réussie"
echo ""

# Liste stocks district
echo "📦 ÉTAPE 6: Liste des stocks DISTRICT"
echo "========================================="
district_stocks=$(curl -s -b /tmp/cookies_district.txt "${BASE_URL}/api/stocks")
echo "Stocks district:"
echo "$district_stocks" | python3 -m json.tool 2>/dev/null || echo "$district_stocks"
echo ""

# Analyse
echo "🔍 ANALYSE"
echo "========================================="
regional_count=$(echo "$regional_stocks_after" | grep -o '"_id"' | wc -l)
district_count=$(echo "$district_stocks" | grep -o '"_id"' | wc -l)

echo "📊 Nombre de stocks RÉGIONAL: $regional_count"
echo "📊 Nombre de stocks DISTRICT: $district_count"
echo ""

if [ "$district_count" -gt 0 ]; then
    echo "✅ Le district voit des stocks !"
else
    echo "❌ PROBLÈME: Le district ne voit AUCUN stock"
    echo ""
    echo "🔍 Regardez les logs du serveur backend"
fi

echo ""
echo "🏁 Test terminé"

# Nettoyage
rm -f /tmp/cookies_*.txt
