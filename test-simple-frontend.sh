#!/bin/bash

# Test ultra simple : voir exactement ce qui est dans la DB

BASE_URL="http://localhost:5000"

echo "🔍 ========================================="
echo "   DIAGNOSTIC BASE DE DONNÉES"
echo "========================================="
echo ""

# Connexion national
read -p "Email NATIONAL: " NATIONAL_EMAIL
read -sp "Password: " NATIONAL_PASSWORD
echo ""

curl -s -c /tmp/cookies.txt -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$NATIONAL_EMAIL\",\"password\":\"$NATIONAL_PASSWORD\"}" > /dev/null

echo "✅ Connecté"
echo ""

# Voir TOUS les stocks
echo "📦 TOUS LES STOCKS DANS LA BASE :"
echo "========================================="
all_stocks=$(curl -s -b /tmp/cookies.txt "${BASE_URL}/api/stocks")

# Parser avec python pour afficher proprement
python3 << 'EOF'
import json
import sys

data = '''ALL_STOCKS_DATA'''

try:
    stocks_data = json.loads(data)
    stocks = stocks_data.get('data', [])
    
    print(f"Total : {len(stocks)} stocks\n")
    
    for i, stock in enumerate(stocks, 1):
        print(f"{i}. ID: {stock.get('_id', 'N/A')}")
        print(f"   Vaccin: {stock.get('vaccine', 'N/A')}")
        print(f"   Lot: {stock.get('batchNumber', 'N/A')}")
        print(f"   Quantité: {stock.get('quantity', 0)}")
        print(f"   Level: '{stock.get('level', 'MISSING')}'")
        print(f"   Region: '{stock.get('region', 'MISSING')}'")
        print(f"   HealthCenter: '{stock.get('healthCenter', 'MISSING')}'")
        print()
        
except Exception as e:
    print(f"Erreur: {e}")
    print(data[:500])
EOF

# Remplacer ALL_STOCKS_DATA par les vraies données
echo "$all_stocks" | python3 -c "
import json
import sys

data = sys.stdin.read()
try:
    stocks_data = json.loads(data)
    stocks = stocks_data.get('data', [])
    
    print(f'Total : {len(stocks)} stocks\n')
    
    for i, stock in enumerate(stocks, 1):
        print(f\"{i}. ID: {stock.get('_id', 'N/A')}\")
        print(f\"   Vaccin: {stock.get('vaccine', 'N/A')}\")
        print(f\"   Lot: {stock.get('batchNumber', 'N/A')}\")
        print(f\"   Quantité: {stock.get('quantity', 0)}\")
        print(f\"   Level: '{stock.get('level', 'MISSING')}'\")
        print(f\"   Region: '{stock.get('region', 'MISSING')}'\")
        print(f\"   HealthCenter: '{stock.get('healthCenter', 'MISSING')}'\")
        print()
        
except Exception as e:
    print(f'Erreur: {e}')
    print(data[:500])
"

echo ""
echo "🔍 ANALYSE :"
echo "========================================="
echo ""
echo "Questions à vérifier :"
echo ""
echo "1. Y a-t-il des stocks avec level='regional' ?"
echo "   → Si OUI : continuez"
echo "   → Si NON : Le transfert n'a pas créé de stock régional"
echo ""
echo "2. Si OUI, quelle est la valeur EXACTE de 'region' ?"
echo "   → Regardez les guillemets : 'Dakar' ou 'dakar' ou autre ?"
echo "   → Y a-t-il des espaces ? Ex: 'Dakar ' ou ' Dakar' ?"
echo ""
echo "3. Comparez avec l'utilisateur régional :"

# Voir les users régionaux
echo ""
echo "👥 UTILISATEURS RÉGIONAUX :"
echo "========================================="
users=$(curl -s -b /tmp/cookies.txt "${BASE_URL}/api/users?role=regional")

echo "$users" | python3 -c "
import json
import sys

data = sys.stdin.read()
try:
    users_data = json.loads(data)
    users = users_data if isinstance(users_data, list) else users_data.get('data', [])
    
    print(f'Total : {len(users)} utilisateurs régionaux\n')
    
    for i, user in enumerate(users, 1):
        print(f\"{i}. Email: {user.get('email', 'N/A')}\")
        print(f\"   Nom: {user.get('name', 'N/A')}\")
        print(f\"   Region: '{user.get('region', 'MISSING')}'\")
        print()
        
except Exception as e:
    print(f'Erreur: {e}')
    print(data[:500])
"

echo ""
echo "🎯 COMPARAISON :"
echo "========================================="
echo "Si un stock a region='Dakar' mais l'user a region='dakar'"
echo "→ ILS NE MATCHERONT PAS (la casse est importante !)"
echo ""
echo "Si un stock a region='Dakar ' (avec espace à la fin)"
echo "→ ILS NE MATCHERONT PAS"
echo ""

rm -f /tmp/cookies.txt

echo "🏁 Diagnostic terminé"
echo ""
echo "COPIEZ-MOI la sortie complète !"
