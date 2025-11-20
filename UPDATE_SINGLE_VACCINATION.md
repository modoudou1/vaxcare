# 🔧 Mise à jour de la vaccination existante

La vaccination que vous avez montrée n'a pas de champ `district`. Voici comment la corriger :

## Vaccination actuelle
```javascript
{
  _id: ObjectId('691b0c9dc138c9fe57e4245a'),
  healthCenter: "District hopital Medina",
  region: "Dakar",
  status: "scheduled",
  // ⚠️ PAS DE CHAMP district
}
```

## Option 1 : Correction manuelle dans MongoDB

```bash
mongosh
use vacxcare

# Mettre à jour cette vaccination spécifique
db.vaccinations.updateOne(
  { _id: ObjectId('691b0c9dc138c9fe57e4245a') },
  { $set: { district: "District hopital Medina" } }
)

# Vérifier
db.vaccinations.findOne({ _id: ObjectId('691b0c9dc138c9fe57e4245a') })
```

## Option 2 : Vérifier et corriger le centre de santé

Le problème peut venir du fait que "District hopital Medina" n'est pas correctement configuré dans la base.

```bash
mongosh
use vacxcare

# 1. Vérifier si le centre existe
db.healthcenters.findOne({ name: "District hopital Medina" })

# 2. Si le centre n'existe PAS, le créer
db.healthcenters.insertOne({
  name: "District hopital Medina",
  type: "district",
  region: "Dakar",
  createdAt: new Date(),
  updatedAt: new Date()
})

# 3. Si le centre existe mais n'a pas type: "district", le mettre à jour
db.healthcenters.updateOne(
  { name: "District hopital Medina" },
  { $set: { type: "district" } }
)

# 4. Maintenant mettre à jour toutes les vaccinations de ce centre
db.vaccinations.updateMany(
  { 
    healthCenter: "District hopital Medina",
    district: { $exists: false }
  },
  { $set: { district: "District hopital Medina" } }
)
```

## Option 3 : Utiliser le script automatique

```bash
cd /Users/macretina/Vacxcare/vacxcare-backend
node scripts/fix-district-vaccinations.js
```

Ce script va :
1. Trouver toutes les vaccinations sans `district`
2. Chercher le centre de santé correspondant
3. Ajouter automatiquement le champ `district`

## Étapes complètes recommandées

```bash
# 1. Vérifier/Créer le centre de santé
mongosh
use vacxcare
db.healthcenters.findOne({ name: "District hopital Medina" })

# Si pas trouvé, créer :
db.healthcenters.insertOne({
  name: "District hopital Medina",
  type: "district",
  region: "Dakar",
  address: "Medina, Dakar",
  createdAt: new Date(),
  updatedAt: new Date()
})

# 2. Mettre à jour les vaccinations
db.vaccinations.updateMany(
  { 
    healthCenter: "District hopital Medina",
    district: { $exists: false }
  },
  { $set: { district: "District hopital Medina" } }
)

# 3. Vérifier
db.vaccinations.findOne({ _id: ObjectId('691b0c9dc138c9fe57e4245a') })
# Résultat attendu : { ..., district: "District hopital Medina" }

# 4. Quitter mongosh
exit
```

## Puis redémarrer le backend

```bash
cd /Users/macretina/Vacxcare/vacxcare-backend
# Arrêter le serveur (Ctrl+C)
npm run dev
```

## Tester

1. **Programmer une NOUVELLE vaccination** pour un enfant
2. **Regarder les logs backend** :
   ```
   🔍 === Résolution district pour vaccination ===
   User healthCenter: District hopital Medina
   User region: Dakar
   User role: district
   🔎 Recherche centre: District hopital Medina région: Dakar
   📍 Centre trouvé - Type: district - DistrictName: undefined
   ✅ District résolu (type=district): District hopital Medina
   🎯 District final: District hopital Medina
   ```

3. **Vérifier en base** :
   ```bash
   db.vaccinations.find().sort({ createdAt: -1 }).limit(1)
   ```
   Devrait afficher `district: "District hopital Medina"`

4. **Aller dans Rendez-vous** : http://localhost:3000/agent/rendez-vous
   Les rendez-vous devraient maintenant s'afficher !

---

**Important** : Après avoir configuré le centre et mis à jour les vaccinations, **redémarrez le backend** pour que les nouvelles vaccinations aient automatiquement le champ `district`.
