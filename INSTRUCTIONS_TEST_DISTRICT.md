# 🧪 INSTRUCTIONS POUR TESTER LE DISTRICT

## ✅ Corrections Appliquées

J'ai corrigé les protections de routes dans **4 pages** du frontend :

1. **`/agent/dashboard/page.tsx`** ✅
2. **`/agent/actors/page.tsx`** ✅
3. **`/agent/team/page.tsx`** ✅
4. **`/agent/calendrier/page.tsx`** ✅

**Avant** :
```typescript
if (!user || user.role !== "agent") {
  router.push("/login");
}
```

**Après** :
```typescript
if (!user || (user.role !== "agent" && user.role !== "district")) {
  router.push("/login");
}
```

---

## 🚀 Comment Tester

### Étape 1 : Redémarrer le Frontend
```bash
cd vacxcare-frontend
# Arrêter le serveur Next.js (Ctrl+C)
npm run dev
```

### Étape 2 : Se Connecter
1. Aller sur **http://localhost:3000/login**
2. Se connecter avec :
   - **Email** : `mm4669036@gmail.com`
   - **Mot de passe** : `password123`

### Étape 3 : Vérifier la Redirection
- ✅ Tu dois être redirigé vers `/agent/dashboard`
- ✅ Tu ne dois **PAS** être renvoyé vers `/login`
- ✅ Le dashboard doit s'afficher avec tes données (2 enfants)

---

## 📊 Ce que Tu Devrais Voir

### Dashboard District
```
📊 Enfants suivis : 2
💉 Vaccinations saisies : 1
📅 Rendez-vous aujourd'hui : 0
📨 Rappels envoyés : 24
```

### Sidebar
Tu dois voir le menu district avec les options :
- 🏠 Tableau de bord
- 👶 Enfants
- 📅 Calendrier
- 💉 Vaccinations
- 🏥 Acteurs de santé
- 👥 Équipe
- 📊 Rapports
- 📦 Stocks
- ⚙️ Paramètres

---

## 🐛 Si Ça Ne Marche Toujours Pas

### Vérifier dans la Console (F12)
```javascript
// Dans l'onglet Console, taper :
localStorage.getItem('token')
// Doit afficher un token JWT

// Vérifier le user
JSON.parse(localStorage.getItem('user') || '{}')
// Doit afficher : { role: "district", email: "mm4669036@gmail.com", ... }
```

### Vérifier dans Network (F12)
1. Onglet **Network**
2. Recharger la page
3. Chercher la requête `GET /api/dashboard/agent`
4. Vérifier que :
   - **Status** : 200 OK (pas 401 ou 403)
   - **Response** contient `totalChildren: 2`

---

## ⚠️ Problèmes Possibles

### Problème 1 : Redirigé vers `/login` encore
**Solution** : Vide le cache du navigateur
```bash
# Dans la console du navigateur (F12)
localStorage.clear()
sessionStorage.clear()
# Puis reconnecte-toi
```

### Problème 2 : Dashboard vide (0 enfants)
**Solution** : Vérifie que le backend accepte le rôle district
```bash
# Dans le terminal backend, tu dois voir :
# ✅ GET /api/dashboard/agent 200
# ✅ GET /api/children 200
```

### Problème 3 : Erreur 401/403
**Solution** : Vérifie le token dans les headers
```bash
# Dans Network (F12), vérifie :
# Authorization: Bearer eyJhbGciOiJIUzI1...
```

---

## 📁 Fichiers Modifiés (Résumé)

### Backend ✅
- `src/models/User.ts` - Rôle "district"
- `src/middleware/auth.ts` - Support district
- `src/controllers/authController.ts` - Migration auto
- `src/controllers/userController.ts` - Hiérarchie de création
- `src/routes/dashboard.ts` - roleCheck avec district
- `src/routes/child.ts` - roleCheck avec district

### Frontend ✅
- `src/app/login/page.tsx` - Redirection vers `/agent/dashboard`
- `src/app/agent/dashboard/page.tsx` - Protection de route
- `src/app/agent/actors/page.tsx` - Protection de route
- `src/app/agent/team/page.tsx` - Protection de route
- `src/app/agent/calendrier/page.tsx` - Protection de route
- `src/app/components/Sidebar.tsx` - Menu district
- `src/context/AuthContext.tsx` - Type User

---

## 🎯 Résultat Attendu

Après ces corrections, tu devrais pouvoir :
1. ✅ Te connecter avec le compte district
2. ✅ Accéder au dashboard agent
3. ✅ Voir les 2 enfants dans le dashboard
4. ✅ Naviguer dans toutes les pages du menu
5. ✅ Ne pas être redirigé vers login

---

**Date** : 2025-11-16 17:20 UTC  
**Status** : ✅ Corrections appliquées, prêt pour test

🚀 **TESTE MAINTENANT !**
