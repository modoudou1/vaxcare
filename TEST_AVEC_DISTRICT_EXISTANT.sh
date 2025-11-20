#!/bin/bash

# 🧪 TEST AVEC LE DISTRICT EXISTANT mm4669036@gmail.com

API="http://localhost:5000/api"

echo ""
echo "=========================================="
echo "🧪 TEST DISTRICT EXISTANT"
echo "=========================================="
echo ""

# ============================================================
# ÉTAPE 1 : CONNEXION DISTRICT
# ============================================================
echo "📍 ÉTAPE 1 : Connexion avec le District existant"
echo "Email: mm4669036@gmail.com"
echo ""

DISTRICT_LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "mm4669036@gmail.com", "password": "password123"}')

echo "$DISTRICT_LOGIN" | head -c 200
echo ""
echo ""

DISTRICT_TOKEN=$(echo "$DISTRICT_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
DISTRICT_ROLE=$(echo "$DISTRICT_LOGIN" | grep -o '"role":"[^"]*"' | cut -d'"' -f4)

if [ -z "$DISTRICT_TOKEN" ]; then
  echo "❌ Échec connexion"
  exit 1
fi

echo "✅ Connecté !"
echo "   Rôle: $DISTRICT_ROLE"
echo ""

if [ "$DISTRICT_ROLE" != "district" ]; then
  echo "⚠️ ATTENTION: Le rôle est '$DISTRICT_ROLE' au lieu de 'district'"
  echo "   La migration automatique devrait se déclencher au prochain login"
fi

echo ""

# ============================================================
# ÉTAPE 2 : DASHBOARD DISTRICT
# ============================================================
echo "📍 ÉTAPE 2 : Dashboard du District"
echo ""

DASHBOARD=$(curl -s -X GET "$API/dashboard/agent" \
  -H "Authorization: Bearer $DISTRICT_TOKEN")

echo "$DASHBOARD" | head -c 300
echo ""
echo ""

TOTAL_CHILDREN=$(echo "$DASHBOARD" | grep -o '"totalChildren":[0-9]*' | cut -d':' -f2)

echo "📊 Enfants suivis: $TOTAL_CHILDREN"
echo ""

if [ "$TOTAL_CHILDREN" -gt "0" ]; then
  echo "✅ Le dashboard fonctionne !"
else
  echo "⚠️ Le dashboard montre 0 enfants"
fi

echo ""

# ============================================================
# ÉTAPE 3 : LISTE ENFANTS
# ============================================================
echo "📍 ÉTAPE 3 : Liste des Enfants"
echo ""

CHILDREN=$(curl -s -X GET "$API/children" \
  -H "Authorization: Bearer $DISTRICT_TOKEN")

echo "$CHILDREN" | head -c 400
echo ""
echo ""

if echo "$CHILDREN" | grep -q '"firstName"'; then
  CHILDREN_COUNT=$(echo "$CHILDREN" | grep -o '"firstName"' | wc -l | tr -d ' ')
  echo "✅ Nombre d'enfants retournés: $CHILDREN_COUNT"
else
  echo "⚠️ Aucun enfant retourné"
fi

echo ""

# ============================================================
# RÉSUMÉ
# ============================================================
echo "=========================================="
echo "📊 RÉSUMÉ"
echo "=========================================="
echo ""
echo "✅ District: mm4669036@gmail.com (role: $DISTRICT_ROLE)"
echo "📊 Dashboard: $TOTAL_CHILDREN enfants"
echo ""

if [ "$DISTRICT_ROLE" == "district" ] && [ "$TOTAL_CHILDREN" -gt "0" ]; then
  echo "🎉 SUCCÈS COMPLET !"
  echo ""
  echo "✅ Le rôle district fonctionne"
  echo "✅ Le dashboard agrège les données"
  echo "✅ La hiérarchie est opérationnelle"
elif [ "$DISTRICT_ROLE" != "district" ]; then
  echo "⚠️ Migration non effectuée"
  echo ""
  echo "Le compte a role='$DISTRICT_ROLE'"
  echo "Redémarre le serveur et reconnecte-toi"
else
  echo "⚠️ Dashboard vide"
  echo ""
  echo "Le rôle est correct mais aucun enfant visible"
  echo "Vérifie les logs backend"
fi

echo ""
echo "=========================================="
echo ""
