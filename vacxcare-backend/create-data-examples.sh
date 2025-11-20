#!/bin/bash

echo "🇸🇳 Création des données du Sénégal via API"
echo "=============================================="

# Base URL
BASE_URL="http://localhost:5000/api/data"

echo ""
echo "1️⃣ Création des vaccins..."
echo "---------------------------"

# Créer les vaccins
curl -X POST $BASE_URL/vaccines \
  -H "Content-Type: application/json" \
  -d '{"name": "BCG", "description": "Vaccin contre la tuberculose", "dosesRequired": 1}'

echo ""

curl -X POST $BASE_URL/vaccines \
  -H "Content-Type: application/json" \
  -d '{"name": "Polio", "description": "Vaccin contre la poliomyélite", "dosesRequired": 3}'

echo ""

curl -X POST $BASE_URL/vaccines \
  -H "Content-Type: application/json" \
  -d '{"name": "DTP", "description": "Diphtérie, Tétanos, Coqueluche", "dosesRequired": 3}'

echo ""

curl -X POST $BASE_URL/vaccines \
  -H "Content-Type: application/json" \
  -d '{"name": "Rougeole", "description": "Vaccin contre la rougeole", "dosesRequired": 2}'

echo ""

curl -X POST $BASE_URL/vaccines \
  -H "Content-Type: application/json" \
  -d '{"name": "Hépatite B", "description": "Vaccin contre l'\''hépatite B", "dosesRequired": 3}'

echo ""

curl -X POST $BASE_URL/vaccines \
  -H "Content-Type: application/json" \
  -d '{"name": "Fièvre jaune", "description": "Vaccin contre la fièvre jaune", "dosesRequired": 1}'

echo ""

curl -X POST $BASE_URL/vaccines \
  -H "Content-Type: application/json" \
  -d '{"name": "Méningite", "description": "Vaccin contre la méningite", "dosesRequired": 1}'

echo ""
echo ""
echo "2️⃣ Création des enfants par région..."
echo "--------------------------------------"

# Créer des enfants dans chaque région du Sénégal
regions=("Dakar" "Thiès" "Diourbel" "Fatick" "Kaolack" "Kolda" "Louga" "Matam" "Saint-Louis" "Tambacounda" "Ziguinchor" "Kaffrine" "Kédougou" "Sédhiou")

for region in "${regions[@]}"; do
  echo "Création d'enfants pour la région: $region"
  curl -X POST $BASE_URL/children \
    -H "Content-Type: application/json" \
    -d "{\"region\": \"$region\", \"count\": 50}"
  echo ""
done

echo ""
echo "3️⃣ Création des vaccinations par mois..."
echo "----------------------------------------"

# Créer des vaccinations pour chaque mois de 2024
months=(1 2 3 4 5 6 7 8 9 10 11 12)
counts=(120 95 140 110 160 180 200 220 190 170 150 130)
month_names=("Janvier" "Février" "Mars" "Avril" "Mai" "Juin" "Juillet" "Août" "Septembre" "Octobre" "Novembre" "Décembre")

for i in "${!months[@]}"; do
  month=${months[$i]}
  count=${counts[$i]}
  month_name=${month_names[$i]}
  
  echo "Création de $count vaccinations pour $month_name 2024"
  curl -X POST $BASE_URL/vaccinations \
    -H "Content-Type: application/json" \
    -d "{\"month\": $month, \"year\": 2024, \"count\": $count}"
  echo ""
done

echo ""
echo "4️⃣ Création des campagnes..."
echo "-----------------------------"

# Créer des campagnes actives
curl -X POST $BASE_URL/campaigns \
  -H "Content-Type: application/json" \
  -d '{"title": "Campagne BCG Nationale 2024-2025", "description": "Campagne nationale de vaccination BCG pour tous les enfants", "startDate": "2024-01-01", "endDate": "2025-12-31", "region": "Toutes"}'

echo ""

curl -X POST $BASE_URL/campaigns \
  -H "Content-Type: application/json" \
  -d '{"title": "Campagne Polio Dakar-Thiès", "description": "Campagne de vaccination Polio dans les régions de Dakar et Thiès", "startDate": "2024-07-01", "endDate": "2025-06-30", "region": "Dakar, Thiès"}'

echo ""

curl -X POST $BASE_URL/campaigns \
  -H "Content-Type: application/json" \
  -d '{"title": "Campagne DTP Sud", "description": "Campagne de vaccination DTP dans les régions du Sud", "startDate": "2024-09-01", "endDate": "2025-08-31", "region": "Ziguinchor, Kolda, Sédhiou"}'

echo ""
echo ""
echo "5️⃣ Vérification des statistiques..."
echo "-----------------------------------"

curl -X GET $BASE_URL/stats

echo ""
echo ""
echo "✅ Données créées avec succès !"
echo "Vous pouvez maintenant accéder au dashboard national avec:"
echo "- Email: national@test.com"
echo "- Mot de passe: 123456"




