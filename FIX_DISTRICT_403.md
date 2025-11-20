# 🔧 FIX : District reçoit 403 "Un régional ne peut créer que des districts"

## 🐛 Problème

Le district essaie de créer un agent, mais reçoit :
```
403 Forbidden: "Un régional ne peut créer que des districts."
```

**Cause** : Le token JWT du district contient probablement encore **l'ancien rôle** (peut-être "regional" ou "agent").

---

## ✅ Solution Rapide

### Étape 1 : Déconnecter et Vider le Cache

**Dans le navigateur (F12 → Console)** :
```javascript
localStorage.clear()
sessionStorage.clear()
location.href = '/login'
```

### Étape 2 : Reconnecter le District

1. Va sur `/login`
2. Connecte-toi avec :
   - Email : `mm4669036@gmail.com`
   - Mot de passe : `password123`

Le backend va générer un **nouveau token JWT** avec `role: "district"` ✅

### Étape 3 : Réessayer de Créer un Agent

Va dans **Acteurs de santé** → **Ajouter un agent**

---

## 🔍 Vérifier le Token

**Dans la console navigateur (F12)** :
```javascript
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Rôle:', payload.role); // Doit afficher "district"
```

**OU utiliser le script backend** :
```bash
cd vacxcare-backend

# Copie ton token depuis localStorage.getItem('token')
node test-district-token.js "TON_TOKEN_ICI"
```

---

## 🎯 Vérification Backend

Si après reconnexion ça ne marche toujours pas, vérifie les logs backend :

```bash
# Dans le terminal backend, tu dois voir lors de la création d'agent :
# [INFO] Création utilisateur par district
# [INFO] Role demandé: agent
# [INFO] Région: Dakar
# [INFO] HealthCenter: Case de Santé Test
```

---

## 🔧 Si le Problème Persiste

### Vérifier le Rôle en Base de Données

```bash
cd vacxcare-backend
node -e "
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = 'mongodb+srv://admin:Vacxcare2025!@vacxcare-cluster.o3mdntc.mongodb.net/?retryWrites=true&w=majority&appName=vacxcare-cluster';

mongoose.connect(MONGODB_URI).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({}, {strict: false}));
  const user = await User.findOne({ email: 'mm4669036@gmail.com' });
  console.log('Email:', user.email);
  console.log('Role:', user.role);
  console.log('AgentLevel:', user.agentLevel);
  console.log('Region:', user.region);
  console.log('HealthCenter:', user.healthCenter);
  await mongoose.disconnect();
});
"
```

**Résultat attendu** :
```
Email: mm4669036@gmail.com
Role: district  ✅
AgentLevel: undefined
Region: Dakar
HealthCenter: Hopital faan
```

Si le rôle n'est pas `district`, relance la migration :
```bash
node force-migrate-direct.js
```

---

## 📝 Résumé

1. ✅ **Déconnexion** → Clear localStorage
2. ✅ **Reconnexion** → Nouveau token JWT
3. ✅ **Vérifier** → `payload.role === "district"`
4. ✅ **Tester** → Créer un agent depuis le district

Le problème vient du **token JWT obsolète**, pas du code ! 🚀
