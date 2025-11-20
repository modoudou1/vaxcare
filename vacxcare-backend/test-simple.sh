#!/bin/bash

echo "🧪 TESTS API SIMPLIFIÉS"
echo "================================="
echo ""

API="http://localhost:5000"

# Credentials
DISTRICT_EMAIL="mm4669036@gmail.com"
DISTRICT_PASS="password123"
CASE_EMAIL="aminagueyesene@gmail.com"
CASE_PASS="password123"

echo "📝 Test avec compte DISTRICT..."
echo "Email: $DISTRICT_EMAIL"
echo ""

# Connexion
echo "1️⃣ Connexion..."
LOGIN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DISTRICT_EMAIL\",\"password\":\"$DISTRICT_PASS\"}")

echo "$LOGIN"
echo ""

TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Échec connexion district, test avec case de santé..."
    echo ""
    
    LOGIN=$(curl -s -X POST "$API/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$CASE_EMAIL\",\"password\":\"$CASE_PASS\"}")
    
    echo "$LOGIN"
    echo ""
    
    TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        echo "❌ Échec total, vérifie les mots de passe"
        exit 1
    fi
fi

echo "✅ Token récupéré: ${TOKEN:0:30}..."
echo ""

# Dashboard
echo "2️⃣ Dashboard agent..."
curl -s "$API/api/dashboard/agent" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

# Enfants
echo "3️⃣ Liste enfants..."
curl -s "$API/api/children" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

# Vaccinations
echo "4️⃣ Liste vaccinations (5 premières)..."
curl -s "$API/api/vaccinations" \
  -H "Authorization: Bearer $TOKEN" | head -c 1000
echo ""
echo "..."
echo ""

echo "================================="
echo "✅ Tests terminés"
echo "================================="
