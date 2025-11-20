#!/bin/bash

# Script de test pour le transfert de stocks
# Ce script teste le flux complet : National -> Regional

BASE_URL="http://localhost:5000"

echo "🔍 ========================================="
echo "   TEST TRANSFERT STOCK NATIONAL -> REGIONAL"
echo "========================================="
echo ""

# Fonction pour extraire les cookies de connexion
get_auth_cookie() {
    local email=$1
    local password=$2
    
    response=$(curl -s -c /tmp/cookies_$email.txt -X POST "${BASE_URL}/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    
    echo "$response"
}

# Fonction pour afficher joliment le JSON
print_json() {
    echo "$1" | python3 -m json.tool 2>/dev/null || echo "$1"
}

echo "📧 ÉTAPE 1: Connexion en tant que NATIONAL"
echo "========================================="
read -p "Email du compte NATIONAL: " NATIONAL_EMAIL
read -sp "Mot de passe: " NATIONAL_PASSWORD
echo ""

national_login=$(get_auth_cookie "$NATIONAL_EMAIL" "$NATIONAL_PASSWORD")
echo "✅ Connexion réussie"
echo ""

echo "📦 ÉTAPE 2: Liste des stocks NATIONAUX"
echo "========================================="
national_stocks=$(curl -s -b /tmp/cookies_$NATIONAL_EMAIL.txt "${BASE_URL}/api/stocks")
echo "Stocks trouvés:"
print_json "$national_stocks"
echo ""

# Extraire le premier stock ID
stock_id=$(echo "$national_stocks" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "🎯 Stock sélectionné: $stock_id"
echo ""

echo "🚀 ÉTAPE 3: Transfert vers Région DAKAR"
echo "========================================="
read -p "Quantité à transférer: " QUANTITY

transfer_response=$(curl -s -b /tmp/cookies_$NATIONAL_EMAIL.txt -X POST "${BASE_URL}/api/stocks/transfers/initiate" \
    -H "Content-Type: application/json" \
    -d "{\"stockId\":\"$stock_id\",\"quantity\":$QUANTITY,\"toRegion\":\"Dakar\"}")

echo "Réponse du transfert:"
print_json "$transfer_response"
echo ""

echo "⏳ Attente de 2 secondes..."
sleep 2
echo ""

echo "📦 ÉTAPE 4: Vérification stocks NATIONAL après transfert"
echo "========================================="
national_stocks_after=$(curl -s -b /tmp/cookies_$NATIONAL_EMAIL.txt "${BASE_URL}/api/stocks")
echo "Stocks nationaux restants:"
print_json "$national_stocks_after"
echo ""

echo "📧 ÉTAPE 5: Connexion en tant que REGIONAL Dakar"
echo "========================================="
read -p "Email du compte REGIONAL Dakar: " REGIONAL_EMAIL
read -sp "Mot de passe: " REGIONAL_PASSWORD
echo ""

regional_login=$(get_auth_cookie "$REGIONAL_EMAIL" "$REGIONAL_PASSWORD")
echo "✅ Connexion réussie"
echo ""

echo "📦 ÉTAPE 6: Liste des stocks RÉGIONAUX Dakar"
echo "========================================="
regional_stocks=$(curl -s -b /tmp/cookies_$REGIONAL_EMAIL.txt "${BASE_URL}/api/stocks")
echo "Stocks régionaux:"
print_json "$regional_stocks"
echo ""

# Analyse
echo "🔍 ANALYSE"
echo "========================================="
national_count=$(echo "$national_stocks_after" | grep -o '"_id"' | wc -l)
regional_count=$(echo "$regional_stocks" | grep -o '"_id"' | wc -l)

echo "📊 Nombre de stocks NATIONAL: $national_count"
echo "📊 Nombre de stocks REGIONAL: $regional_count"
echo ""

if [ "$regional_count" -gt 0 ]; then
    echo "✅ Le régional voit des stocks !"
else
    echo "❌ PROBLÈME: Le régional ne voit AUCUN stock"
    echo ""
    echo "🔍 Regardez les logs du serveur backend pour voir:"
    echo "   - Les requêtes MongoDB"
    echo "   - Les stocks créés lors du transfert"
    echo "   - Le filtrage appliqué"
fi

echo ""
echo "🏁 Test terminé"

# Nettoyage
rm -f /tmp/cookies_*.txt
