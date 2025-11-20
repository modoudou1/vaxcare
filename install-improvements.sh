#!/bin/bash

echo "🚀 Installation des améliorations VaxCare"
echo "=========================================="

# Aller dans le dossier backend
cd vacxcare-backend

echo "📦 Installation des dépendances backend..."

# Installer les dépendances de production
npm install express-rate-limit express-validator helmet compression morgan

# Installer les dépendances de développement
npm install --save-dev @types/jest @types/supertest jest supertest mongodb-memory-server ts-jest

echo "✅ Dépendances backend installées"

# Retourner au dossier racine
cd ..

echo ""
echo "🎉 Installation terminée !"
echo ""
echo "📋 Prochaines étapes :"
echo "1. Redémarrer le serveur backend"
echo "2. Lancer les tests : cd vacxcare-backend && npm test"
echo "3. Vérifier la santé : curl http://localhost:5000/health"
echo ""
echo "📚 Documentation complète : IMPROVEMENTS_README.md"
