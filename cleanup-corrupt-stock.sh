#!/bin/bash

# Script pour supprimer le stock corrompu

BASE_URL="http://localhost:5000"
STOCK_ID="691a73a8619d3944d3e5e88b"

echo "🧹 ========================================="
echo "   NETTOYAGE STOCK CORROMPU"
echo "========================================="
echo ""
echo "Stock à supprimer: $STOCK_ID"
echo "(level: national MAIS region: Dakar - INVALIDE)"
echo ""

# Connexion en tant que national
read -p "Email du compte NATIONAL: " NATIONAL_EMAIL
read -sp "Mot de passe: " NATIONAL_PASSWORD
echo ""

echo "📧 Connexion..."
login_response=$(curl -s -c /tmp/cookies_national.txt -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$NATIONAL_EMAIL\",\"password\":\"$NATIONAL_PASSWORD\"}")

echo "✅ Connecté"
echo ""

echo "🗑️  Suppression du stock corrompu..."
delete_response=$(curl -s -b /tmp/cookies_national.txt -X DELETE "${BASE_URL}/api/stocks/${STOCK_ID}")

echo "Réponse:"
echo "$delete_response" | python3 -m json.tool 2>/dev/null || echo "$delete_response"
echo ""

echo "✅ Vérification..."
stocks_after=$(curl -s -b /tmp/cookies_national.txt "${BASE_URL}/api/stocks")
count=$(echo "$stocks_after" | grep -o '"_id"' | wc -l)

echo "📊 Stocks nationaux restants: $count"
echo ""

if echo "$stocks_after" | grep -q "$STOCK_ID"; then
    echo "❌ Le stock est toujours présent"
else
    echo "✅ Stock corrompu supprimé avec succès !"
fi

echo ""
echo "🏁 Nettoyage terminé"

# Nettoyage
rm -f /tmp/cookies_*.txt
