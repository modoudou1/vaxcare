# 🔍 Guide de Debug - Rendez-vous District

## Étape 1 : Exécuter le script de correction

Ce script va mettre à jour toutes les vaccinations existantes pour ajouter le champ `district`.

```bash
cd /Users/macretina/Vacxcare/vacxcare-backend
node scripts/fix-district-vaccinations.js
```

### Ce que le script fait :
1. ✅ Compte les vaccinations sans champ `district`
2. ✅ Récupère tous les centres de santé
3. ✅ Crée un mapping `healthCenter → district`
4. ✅ Met à jour chaque vaccination avec le district correspondant
5. ✅ Affiche un résumé des modifications

### Résultat attendu :
```
📊 Vaccinations sans champ district : X
📍 Centres de santé trouvés : Y
🔄 Mise à jour de X vaccinations...
✅ "Centre A" → "District Z"
✅ "Centre B" → "District Z"
...
✅ Vaccinations mises à jour : X
```

---

## Étape 2 : Vérifier les données en base

### Vérifier qu'un district existe
```bash
mongosh
use vacxcare
db.healthcenters.find({ type: "district" })
```

### Vérifier qu'une structure a un districtName
```bash
db.healthcenters.find({ districtName: { $exists: true } })
```

### Vérifier qu'une vaccination a un district
```bash
db.vaccinations.find({ district: { $exists: true } }).limit(5)
```

### Compter les vaccinations par district
```bash
db.vaccinations.aggregate([
  { $match: { district: { $exists: true } } },
  { $group: { _id: '$district', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

---

## Étape 3 : Démarrer le backend avec les logs de debug

```bash
cd /Users/macretina/Vacxcare/vacxcare-backend
npm run dev
```

### Les logs de debug afficheront :
```
🔍 === DEBUG getAppointments ===
Paramètre district reçu: District Thiès
📍 Centres trouvés pour district "District Thiès": 4
  - District Thiès
  - Case de Santé Mbour
  - Poste de Santé Joal
  - Clinique Saly
🔎 Filtre vaccinations: {
  "$or": [
    { "district": "District Thiès" },
    { "healthCenter": { "$in": ["District Thiès", "Case de Santé Mbour", ...] } }
  ]
}
📊 Vaccinations trouvées: 3
📋 Exemples de vaccinations trouvées:
  - Vaccin: BCG, Enfant: Fatou, Status: scheduled, District: District Thiès, HealthCenter: District Thiès
  - Vaccin: Polio, Enfant: Amadou, Status: scheduled, District: District Thiès, HealthCenter: Case de Santé Mbour
📊 Appointments trouvés: 0
📋 3 rendez-vous combinés (sans duplication)
  - 3 vaccinations
  - 0 appointments
  - Uniques: 3
📤 Exemples de rendez-vous retournés:
  1. BCG - Fatou (scheduled) - District Thiès
  2. Polio - Amadou (scheduled) - Case de Santé Mbour
```

---

## Étape 4 : Tester le frontend

1. **Ouvrir le navigateur** : http://localhost:3000
2. **Se connecter** avec un compte district
3. **Aller dans Rendez-vous** : http://localhost:3000/agent/rendez-vous
4. **Ouvrir la console** du navigateur (F12)

### Dans la console frontend, vous devriez voir :
```
✅ Rendez-vous chargés depuis API: [...]
   → Nombre reçu: 3
📌 Mapping rendez-vous: {vaccine: "BCG", statusBackend: "scheduled", statusMapped: "scheduled", date: "2024-11-20"}
📊 Total rendez-vous après mapping: 3
  - Programmés: 3
  - Complétés: 0
```

---

## Étape 5 : Vérifier la requête réseau

1. **Ouvrir les DevTools** (F12)
2. **Aller dans l'onglet Network**
3. **Filtrer par "appointments"**
4. **Regarder la requête**

### URL attendue :
```
http://localhost:5000/api/appointments?district=District%20Thi%C3%A8s
```

### Réponse attendue :
```json
[
  {
    "_id": "...",
    "childName": "Fatou",
    "vaccine": { "name": "BCG" },
    "date": "2024-11-20T10:00:00.000Z",
    "status": "scheduled",
    "healthCenter": "District Thiès"
  },
  ...
]
```

---

## 🐛 Problèmes courants

### Problème 1 : Aucune vaccination trouvée

**Symptôme** :
```
📊 Vaccinations trouvées: 0
```

**Solutions** :
1. Vérifier que le script de correction a été exécuté
2. Vérifier que les vaccinations ont un `district` :
   ```bash
   db.vaccinations.find({ district: { $exists: false } }).count()
   ```
3. Vérifier le nom exact du district :
   ```bash
   db.vaccinations.distinct('district')
   db.healthcenters.distinct('name', { type: 'district' })
   ```

### Problème 2 : Les centres ne sont pas trouvés

**Symptôme** :
```
📍 Centres trouvés pour district "District Thiès": 0
```

**Solutions** :
1. Vérifier le nom exact du district :
   ```bash
   db.healthcenters.findOne({ type: 'district' })
   ```
2. Vérifier que les structures ont un `districtName` :
   ```bash
   db.healthcenters.find({ districtName: { $exists: true } })
   ```
3. Mettre à jour si nécessaire :
   ```bash
   db.healthcenters.updateMany(
     { name: { $in: ["Case de Santé Mbour", "Poste de Santé Joal"] } },
     { $set: { districtName: "District Thiès" } }
   )
   ```

### Problème 3 : Le paramètre district n'est pas passé

**Symptôme** :
```
Paramètre district reçu: undefined
```

**Solutions** :
1. Vérifier que l'utilisateur a le rôle "district" :
   ```bash
   db.users.findOne({ role: 'district' })
   ```
2. Vérifier que l'utilisateur a un `healthCenter` :
   ```bash
   db.users.findOne({ role: 'district', healthCenter: { $exists: true } })
   ```
3. Vérifier dans la console frontend que `user?.role === "district"`

### Problème 4 : Vaccinations créées mais sans district

**Symptôme** : Les nouvelles vaccinations n'ont pas de `district`

**Solution** : Redémarrer le backend après les modifications du code :
```bash
# Arrêter le serveur (Ctrl+C)
npm run dev
```

---

## ✅ Checklist de vérification

- [ ] Script de correction exécuté avec succès
- [ ] Au moins 1 vaccination a un champ `district`
- [ ] Au moins 1 centre de santé a `type: "district"`
- [ ] Au moins 1 structure a `districtName`
- [ ] Backend redémarré après les modifications
- [ ] Frontend rafraîchi (Ctrl+R)
- [ ] Utilisateur connecté a `role: "district"`
- [ ] Utilisateur connecté a un `healthCenter`
- [ ] URL contient `?district=...`
- [ ] Logs backend affichent les vaccinations trouvées
- [ ] Console frontend affiche les rendez-vous reçus

---

## 🔧 Commandes de réparation rapide

### Si aucune vaccination n'a de district
```bash
mongosh
use vacxcare

# Mettre à jour toutes les vaccinations du District Thiès
db.vaccinations.updateMany(
  { 
    district: { $exists: false },
    healthCenter: "District Thiès"
  },
  { $set: { district: "District Thiès" } }
)

# Mettre à jour les vaccinations des structures
db.vaccinations.updateMany(
  { 
    district: { $exists: false },
    healthCenter: "Case de Santé Mbour"
  },
  { $set: { district: "District Thiès" } }
)
```

### Si les structures n'ont pas de districtName
```bash
db.healthcenters.updateMany(
  { 
    name: { $in: [
      "Case de Santé Mbour",
      "Poste de Santé Joal",
      "Clinique Saly",
      "Centre de Santé Pout"
    ]}
  },
  { $set: { districtName: "District Thiès" } }
)
```

---

## 📞 Besoin d'aide ?

Si après avoir suivi ce guide, les rendez-vous ne s'affichent toujours pas :

1. **Copier les logs du backend** (les lignes qui commencent par 🔍, 📍, 📊)
2. **Copier les logs du frontend** (console navigateur)
3. **Copier la requête Network** (onglet Network dans DevTools)
4. **Vérifier les données** :
   ```bash
   db.vaccinations.find({ healthCenter: "District Thiès" }).pretty()
   db.users.findOne({ role: "district" })
   ```

---

**Date** : 17 novembre 2024  
**Version** : 1.0.0
