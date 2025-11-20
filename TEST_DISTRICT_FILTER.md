# 🧪 Test du filtrage District

## ⚡ Test rapide (2 minutes)

### 1. Créer un compte district de test

Dans MongoDB (via mongosh ou MongoDB Compass) :

```javascript
db.users.insertOne({
  email: "district.test@vacxcare.sn",
  password: "$2b$10$YmI4MzFhZjhjNTY0NjEwOeQBPG/xY9qGjK3JX5mVE5B8Y.WqKvLxW", // district123
  role: "district",
  region: "Thiès",
  healthCenter: "District Thiès",
  firstName: "Test",
  lastName: "District",
  phone: "+221770000000",
  active: true,
  permissions: {
    dashboard: true,
    enfants: true,
    rendezvous: true
  },
  createdAt: new Date(),
  updatedAt: new Date()
});
```

### 2. Créer quelques enfants de test

```javascript
// Enfant du district direct
db.children.insertOne({
  firstName: "Fatou",
  lastName: "Diop",
  gender: "F",
  birthDate: new Date("2022-06-15"),
  healthCenter: "District Thiès", // ← Match avec user.healthCenter
  region: "Thiès",
  parentInfo: {
    parentName: "Aissatou Diop",
    parentPhone: "+221771111111"
  },
  status: "À jour",
  parentAccessCode: "123456",
  createdAt: new Date()
});

// Enfant d'un acteur de santé
db.children.insertOne({
  firstName: "Amadou",
  lastName: "Ba",
  gender: "M",
  birthDate: new Date("2023-03-20"),
  healthCenter: "Case de Santé Mbour", // ← Différent de user.healthCenter
  region: "Thiès",
  parentInfo: {
    parentName: "Mariama Ba",
    parentPhone: "+221772222222"
  },
  status: "En retard",
  parentAccessCode: "234567",
  createdAt: new Date()
});
```

### 3. Se connecter et tester

1. **Démarrer le serveur** :
   ```bash
   # Terminal 1 - Backend
   cd vacxcare-backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd vacxcare-frontend
   npm run dev
   ```

2. **Se connecter** :
   - URL : http://localhost:3000/login
   - Email : `district.test@vacxcare.sn`
   - Password : `district123`

3. **Aller dans Enfants** :
   - Cliquer sur "Enfants" dans la sidebar
   - URL : http://localhost:3000/agent/enfants

4. **Vérifier les statistiques** :
   - ✅ Total enfants : 2
   - ✅ District Direct : 1 (Fatou)
   - ✅ Acteurs de Santé : 1 (Amadou)

5. **Tester les filtres** :
   - ✅ Cliquer sur "Tous" → Voir 2 enfants
   - ✅ Cliquer sur "District" → Voir 1 enfant (Fatou)
   - ✅ Cliquer sur "Acteurs" → Voir 1 enfant (Amadou)

6. **Vérifier les badges** :
   - ✅ Fatou a un badge **vert "District"**
   - ✅ Amadou a un badge **violet "Acteur"**

7. **Tester les modals** :
   - ✅ Cliquer sur Fatou → Modal complet avec formulaire de programmation
   - ✅ Cliquer sur Amadou → Modal en lecture seule sans programmation

## 📊 Comparaison Agent vs District

### Connexion en tant qu'agent

Si vous vous connectez avec un compte **agent** (pas district) :
- ✅ Les filtres district **ne s'affichent PAS**
- ✅ Les statistiques affichent "À jour" et "En retard"
- ✅ Les badges de type **ne s'affichent PAS**
- ✅ Tous les enfants ouvrent le **même modal complet**

### Connexion en tant que district

Si vous vous connectez avec un compte **district** :
- ✅ Les filtres district **s'affichent**
- ✅ Les statistiques affichent "District Direct" et "Acteurs de Santé"
- ✅ Les badges de type **s'affichent** (vert/violet)
- ✅ Les enfants ouvrent des **modals différents** selon leur type

## 🎯 Checklist de test

- [ ] Compte district créé
- [ ] Enfants de test créés (au moins 1 direct + 1 acteur)
- [ ] Backend démarré (port 5000)
- [ ] Frontend démarré (port 3000)
- [ ] Connexion réussie avec compte district
- [ ] Navigation vers /agent/enfants
- [ ] Statistiques affichées correctement
- [ ] Filtres district visibles
- [ ] Badges de type visibles
- [ ] Filtre "Tous" fonctionne
- [ ] Filtre "District" fonctionne
- [ ] Filtre "Acteurs" fonctionne
- [ ] Modal complet pour enfant district
- [ ] Modal lecture seule pour enfant acteur
- [ ] Test avec compte agent (filtres invisibles)

## 🐛 Problèmes courants

### Problème : Filtres district ne s'affichent pas
**Solutions** :
1. Vérifier que `role: "district"` dans la base de données
2. Vérifier le token JWT dans les DevTools → Application → Cookies
3. Vider le cache et se reconnecter

### Problème : Tous les enfants affichent "Acteur"
**Solutions** :
1. Vérifier que `user.healthCenter === "District Thiès"`
2. Vérifier que l'enfant a `healthCenter: "District Thiès"` (exactement)
3. La comparaison est sensible à la casse

### Problème : Statistiques à 0
**Solutions** :
1. Vérifier que les enfants existent en base
2. Vérifier que les enfants ont la même `region` que l'utilisateur
3. Vérifier les filtres backend (API `/api/children`)

### Problème : Modal incorrect
**Solutions** :
1. Vérifier la logique `isDistrictChild`
2. Regarder les logs de la console navigateur
3. Vérifier l'import de `RegionalChildDetailsModal`

## 📝 Commandes utiles

### Vérifier les données en base

```javascript
// Compter les enfants
db.children.countDocuments({ healthCenter: "District Thiès" })

// Voir les enfants
db.children.find({ healthCenter: "District Thiès" }).pretty()

// Voir l'utilisateur district
db.users.findOne({ role: "district" })

// Changer le healthCenter d'un enfant
db.children.updateOne(
  { firstName: "Fatou" },
  { $set: { healthCenter: "District Thiès" } }
)
```

### Nettoyer les données de test

```javascript
// Supprimer l'utilisateur test
db.users.deleteOne({ email: "district.test@vacxcare.sn" })

// Supprimer les enfants test
db.children.deleteMany({ 
  firstName: { $in: ["Fatou", "Amadou"] }
})
```

## 🎉 Résultat attendu

Après avoir suivi tous les tests, vous devriez avoir :
- ✅ Une interface qui s'adapte automatiquement au rôle
- ✅ Des filtres qui apparaissent uniquement pour les districts
- ✅ Des statistiques différentes selon le rôle
- ✅ Des modals différents selon l'origine de l'enfant
- ✅ Une expérience utilisateur cohérente pour tous les rôles

---

**Temps de test** : ~5 minutes  
**Prérequis** : MongoDB + Backend + Frontend démarrés
