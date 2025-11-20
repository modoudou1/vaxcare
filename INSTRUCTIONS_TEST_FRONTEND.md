# 🎯 INSTRUCTIONS POUR TESTER LE FRONTEND

## ✅ Ce qui est confirmé

Le **backend fonctionne PARFAITEMENT** :
- ✅ API `/api/dashboard/agent` retourne `totalChildren: 2`
- ✅ Avec cookies (comme le frontend)
- ✅ Avec Bearer token  
- ✅ Les données sont bien en base

**Le problème est 100% FRONTEND** ou dans ton navigateur !

---

## 🔍 ÉTAPES DE DEBUG

### 1. Vérifie que le frontend tourne

```bash
cd /Users/macretina/Vacxcare/vacxcare-frontend
npm run dev
```

Va sur : http://localhost:3000

---

### 2. Déconnecte-toi complètement

**IMPORTANT** : Tu es peut-être connecté avec le mauvais compte !

1. Dans le frontend, clique sur **Déconnexion**
2. Ferme le navigateur
3. Rouvre le navigateur
4. Va sur http://localhost:3000

---

### 3. Connecte-toi avec le compte DISTRICT

**Credentials** :
- **Email** : `mm4669036@gmail.com`
- **Mot de passe** : `password123`

---

### 4. Ouvre la Console du Navigateur

**AVANT** d'aller sur le dashboard :
1. Appuie sur **F12** (ou Cmd+Option+I sur Mac)
2. Va dans l'onglet **Console**
3. Efface la console (icône poubelle)

---

### 5. Va sur le Dashboard Agent

Navigue vers : http://localhost:3000/dashboard/agent

**Dans la console**, tu DOIS voir ces logs :

```
🔍 Dashboard - Fetching from: http://localhost:5000/api/dashboard/agent?...
📊 Dashboard - Response status: 200
✅ Dashboard - Data received: {totalChildren: 2, ...}
  - totalChildren: 2
  - vaccinationsSaisies: 1
📈 Stats updated: {totalChildren: 2, ...}
```

---

## 📊 RÉSULTATS POSSIBLES

### ✅ Cas 1 : Tu vois `totalChildren: 2` dans les logs

**Problème** : Les données arrivent mais ne s'affichent pas
**Solution** : Problème de rendering React, envoie-moi une capture d'écran

---

### ❌ Cas 2 : Tu vois `totalChildren: 0` dans les logs

**Problème** : Le backend retourne 0 pour ton compte
**Causes possibles** :
1. Tu es connecté avec le mauvais compte
2. Les cookies ont expiré
3. Problème de session

**Solution** :
1. Regarde dans la console le log `🔍 Dashboard - Data received`
2. Copie-moi la réponse complète
3. Vérifie dans **Application** > **Cookies** > `localhost` si le cookie `token` existe

---

### ❌ Cas 3 : Erreur dans les logs

Si tu vois :
```
❌ Erreur global dashboard: ...
```

**Solution** : Copie-moi l'erreur complète

---

### ❌ Cas 4 : Aucun log n'apparaît

**Problème** : Le useEffect ne se déclenche pas
**Causes possibles** :
1. L'utilisateur n'est pas connecté
2. Le role n'est pas "agent"

**Solution** : Vérifie dans la console si tu vois d'autres erreurs

---

## 🔧 VÉRIFICATIONS SUPPLÉMENTAIRES

### A. Vérifier le compte connecté

Dans la console du navigateur, tape :
```javascript
document.cookie
```

Tu devrais voir un cookie `user=...` avec des infos JSON.

---

### B. Vérifier directement l'API

Dans la console du navigateur, tape :
```javascript
fetch('http://localhost:5000/api/dashboard/agent', {
  credentials: 'include'
})
.then(r => r.json())
.then(d => console.log('📊 Direct API call:', d))
```

Dis-moi ce qui s'affiche.

---

### C. Vérifier le token

Dans la console, tape :
```javascript
fetch('http://localhost:5000/api/auth/me', {
  credentials: 'include'
})
.then(r => r.json())
.then(d => console.log('👤 User info:', d))
```

Dis-moi ce qui s'affiche (surtout `healthCenter` et `agentLevel`).

---

## 🆘 SI RIEN NE MARCHE

Envoie-moi :
1. **Capture d'écran du dashboard** (même si c'est 0 partout)
2. **Toute la console du navigateur** (F12 > Console > copie tout)
3. **Résultat des 3 commandes** (A, B, C ci-dessus)
4. **Résultat de** : `curl -b cookies.txt http://localhost:5000/api/dashboard/agent` (après connexion)

---

## 🎯 CE QUE TU DOIS VOIR SI TOUT MARCHE

Le dashboard doit afficher :
- **Enfants suivis** : 2 (ou plus)
- **Vaccinations saisies** : 1 (ou plus)
- **Rendez-vous du jour** : 0

Et dans la console :
```
✅ Dashboard - Data received: {totalChildren: 2, appointmentsToday: 0, ...}
```

---

**Date** : 2025-11-16 16:15 UTC
**Backend Status** : ✅ Confirmed Working
**Frontend Status** : ⏳ Needs Testing

**COMMENCE PAR L'ÉTAPE 2** (Déconnexion complète) ! C'est souvent ça le problème.
