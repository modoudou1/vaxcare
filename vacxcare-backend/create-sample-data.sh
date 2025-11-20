#!/bin/bash

echo "🇸🇳 Création de données d'exemple pour le dashboard"
echo "=================================================="

BASE_URL="http://localhost:5000/api/data"

echo ""
echo "1️⃣ Création d'enfants dans quelques régions..."
echo "----------------------------------------------"

# Créer des enfants dans quelques régions
curl -X POST $BASE_URL/children \
  -H "Content-Type: application/json" \
  -d '{"region": "Thiès", "count": 30}' > /dev/null 2>&1

curl -X POST $BASE_URL/children \
  -H "Content-Type: application/json" \
  -d '{"region": "Diourbel", "count": 25}' > /dev/null 2>&1

curl -X POST $BASE_URL/children \
  -H "Content-Type: application/json" \
  -d '{"region": "Fatick", "count": 20}' > /dev/null 2>&1

echo "✅ Enfants créés dans Thiès, Diourbel et Fatick"

echo ""
echo "2️⃣ Création de vaccinations pour quelques mois..."
echo "------------------------------------------------"

# Créer des vaccinations pour quelques mois
curl -X POST $BASE_URL/vaccinations \
  -H "Content-Type: application/json" \
  -d '{"month": 2, "year": 2024, "count": 50}' > /dev/null 2>&1

curl -X POST $BASE_URL/vaccinations \
  -H "Content-Type: application/json" \
  -d '{"month": 3, "year": 2024, "count": 75}' > /dev/null 2>&1

curl -X POST $BASE_URL/vaccinations \
  -H "Content-Type: application/json" \
  -d '{"month": 4, "year": 2024, "count": 60}' > /dev/null 2>&1

echo "✅ Vaccinations créées pour Février, Mars et Avril 2024"

echo ""
echo "3️⃣ Création d'une campagne..."
echo "-----------------------------"

curl -X POST $BASE_URL/campaigns \
  -H "Content-Type: application/json" \
  -d '{"title": "Campagne Test 2024", "description": "Campagne de test pour le dashboard", "startDate": "2024-01-01", "endDate": "2025-12-31", "region": "Toutes"}' > /dev/null 2>&1

echo "✅ Campagne créée"

echo ""
echo "4️⃣ Vérification des statistiques..."
echo "----------------------------------"

curl -X GET $BASE_URL/stats

echo ""
echo ""
echo "✅ Données d'exemple créées avec succès !"
echo "Le dashboard affichera maintenant les vraies données de la base MongoDB."




