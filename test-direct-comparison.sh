#!/bin/bash

# Test direct : comparer ce que voit le national vs le régional

BASE_URL="http://localhost:5000"

echo "🔍 ========================================="
echo "   TEST COMPARATIF NATIONAL vs REGIONAL"
echo "========================================="
echo ""

# PARTIE 1 : NATIONAL
echo "📦 PARTIE 1 : STOCKS DU NATIONAL"
echo "========================================="
read -p "Email NATIONAL: " NATIONAL_EMAIL
read -sp "Password: " NATIONAL_PASSWORD
echo ""

curl -s -c /tmp/cookies_nat.txt -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$NATIONAL_EMAIL\",\"password\":\"$NATIONAL_PASSWORD\"}" > /dev/null

echo "✅ National connecté"
echo ""

national_stocks=$(curl -s -b /tmp/cookies_nat.txt "${BASE_URL}/api/stocks")
nat_count=$(echo "$national_stocks" | grep -o '"_id"' | wc -l | tr -d ' ')

echo "Le NATIONAL voit : $nat_count stocks"
echo ""
echo "Détails :"
echo "$national_stocks" | python3 -m json.tool 2>/dev/null | head -30
echo ""

# PARTIE 2 : REGIONAL
echo "📦 PARTIE 2 : STOCKS DU RÉGIONAL"
echo "========================================="
read -p "Email RÉGIONAL Dakar: " REGIONAL_EMAIL
read -sp "Password: " REGIONAL_PASSWORD
echo ""

curl -s -c /tmp/cookies_reg.txt -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$REGIONAL_EMAIL\",\"password\":\"$REGIONAL_PASSWORD\"}" > /dev/null

echo "✅ Régional connecté"
echo ""

regional_stocks=$(curl -s -b /tmp/cookies_reg.txt "${BASE_URL}/api/stocks")
reg_count=$(echo "$regional_stocks" | grep -o '"_id"' | wc -l | tr -d ' ')

echo "Le RÉGIONAL voit : $reg_count stocks"
echo ""
echo "Détails :"
echo "$regional_stocks" | python3 -m json.tool 2>/dev/null | head -30
echo ""

# PARTIE 3 : TRANSFERT
echo "🚀 PARTIE 3 : NOUVEAU TRANSFERT"
echo "========================================="

if [ "$nat_count" -eq 0 ]; then
    echo "❌ ERREUR : Aucun stock national disponible pour transfert"
    echo "Vous devez d'abord créer un stock en tant que national !"
    exit 1
fi

# Extraire le premier stock ID
stock_id=$(echo "$national_stocks" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "📦 Stock sélectionné : $stock_id"
echo ""

read -p "Quantité à transférer : " QUANTITY
echo ""

echo "🚀 Envoi du transfert vers 'Dakar'..."
transfer_response=$(curl -s -b /tmp/cookies_nat.txt -X POST "${BASE_URL}/api/stocks/transfers/initiate" \
    -H "Content-Type: application/json" \
    -d "{\"stockId\":\"$stock_id\",\"quantity\":$QUANTITY,\"toRegion\":\"Dakar\"}")

echo "Réponse du transfert :"
echo "$transfer_response" | python3 -m json.tool 2>/dev/null
echo ""

# Vérifier si le transfert a réussi
if echo "$transfer_response" | grep -q '"message":"Transfert effectué avec succès"'; then
    echo "✅ Transfert réussi !"
    
    # Extraire le stock destination créé
    dest_region=$(echo "$transfer_response" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('destinationStock', {}).get('region', 'N/A'))" 2>/dev/null)
    dest_level=$(echo "$transfer_response" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('destinationStock', {}).get('level', 'N/A'))" 2>/dev/null)
    
    echo ""
    echo "📊 Stock destination créé :"
    echo "   Level  : '$dest_level'"
    echo "   Region : '$dest_region'"
else
    echo "❌ Échec du transfert"
    exit 1
fi

echo ""
echo "⏳ Attente de 2 secondes..."
sleep 2

# PARTIE 4 : VÉRIFICATION RÉGIONAL
echo ""
echo "📦 PARTIE 4 : VÉRIFICATION CÔTÉ RÉGIONAL"
echo "========================================="

regional_stocks_after=$(curl -s -b /tmp/cookies_reg.txt "${BASE_URL}/api/stocks")
reg_count_after=$(echo "$regional_stocks_after" | grep -o '"_id"' | wc -l | tr -d ' ')

echo "Le RÉGIONAL voit maintenant : $reg_count_after stocks (avant: $reg_count)"
echo ""

if [ "$reg_count_after" -gt "$reg_count" ]; then
    echo "✅ SUCCESS ! Le régional voit le nouveau stock !"
    echo ""
    echo "Détails :"
    echo "$regional_stocks_after" | python3 -m json.tool 2>/dev/null
else
    echo "❌ PROBLÈME ! Le régional ne voit pas le nouveau stock"
    echo ""
    echo "🔍 Debugging nécessaire..."
    echo ""
    echo "Regardez les logs du serveur backend pour voir :"
    echo "1. Le stock a-t-il été créé avec region='Dakar' exactement ?"
    echo "2. L'user régional a-t-il region='Dakar' exactement ?"
    echo "3. Le filtre MongoDB trouve-t-il le match ?"
fi

echo ""
echo "🏁 Test terminé"

# Nettoyage
rm -f /tmp/cookies_*.txt
