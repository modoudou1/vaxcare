# 🧪 Test de l'isolation des rendez-vous agents

## Objectif
Vérifier que les agents voient uniquement leurs propres rendez-vous et non ceux des autres acteurs ni du district.

## Pré-requis

1. **Un district** : District Thiès
2. **Deux agents** : 
   - Agent A : Case de Santé Mbour
   - Agent B : Poste de Santé Joal
3. **Des vaccinations programmées pour chaque centre**

## Étape 1 : Créer les données de test

### Créer un agent A

```javascript
// Dans mongosh
use vacxcare

db.users.insertOne({
  email: "agent.mbour@vacxcare.sn",
  password: "$2b$10$YmI4MzFhZjhjNTY0NjEwOeQBPG/xY9qGjK3JX5mVE5B8Y.WqKvLxW", // agent123
  role: "agent",
  region: "Thiès",
  healthCenter: "Case de Santé Mbour",
  firstName: "Agent",
  lastName: "Mbour",
  phone: "+221771111111",
  active: true,
  createdAt: new Date(),
  updatedAt: new Date()
})

// Récupérer l'ID
const agentA = db.users.findOne({ email: "agent.mbour@vacxcare.sn" })._id
```

### Créer un agent B

```javascript
db.users.insertOne({
  email: "agent.joal@vacxcare.sn",
  password: "$2b$10$YmI4MzFhZjhjNTY0NjEwOeQBPG/xY9qGjK3JX5mVE5B8Y.WqKvLxW", // agent123
  role: "agent",
  region: "Thiès",
  healthCenter: "Poste de Santé Joal",
  firstName: "Agent",
  lastName: "Joal",
  phone: "+221772222222",
  active: true,
  createdAt: new Date(),
  updatedAt: new Date()
})

const agentB = db.users.findOne({ email: "agent.joal@vacxcare.sn" })._id
```

### Créer les centres de santé

```javascript
// District
db.healthcenters.insertOne({
  name: "District Thiès",
  type: "district",
  region: "Thiès",
  address: "Centre-ville, Thiès",
  createdAt: new Date(),
  updatedAt: new Date()
})

// Centre A
db.healthcenters.insertOne({
  name: "Case de Santé Mbour",
  type: "case",
  region: "Thiès",
  districtName: "District Thiès",
  address: "Mbour, Thiès",
  createdAt: new Date(),
  updatedAt: new Date()
})

// Centre B
db.healthcenters.insertOne({
  name: "Poste de Santé Joal",
  type: "poste",
  region: "Thiès",
  districtName: "District Thiès",
  address: "Joal, Thiès",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Créer des enfants de test

```javascript
// Enfant pour agent A
db.children.insertOne({
  name: "Fatou Sow",
  gender: "female",
  birthDate: new Date("2024-01-15"),
  parentPhone: "+221770000001",
  healthCenter: "Case de Santé Mbour",
  region: "Thiès",
  district: "District Thiès",
  registeredBy: agentA,
  createdAt: new Date(),
  updatedAt: new Date()
})

const childA = db.children.findOne({ name: "Fatou Sow" })._id

// Enfant pour agent B
db.children.insertOne({
  name: "Amadou Fall",
  gender: "male",
  birthDate: new Date("2024-02-20"),
  parentPhone: "+221770000002",
  healthCenter: "Poste de Santé Joal",
  region: "Thiès",
  district: "District Thiès",
  registeredBy: agentB,
  createdAt: new Date(),
  updatedAt: new Date()
})

const childB = db.children.findOne({ name: "Amadou Fall" })._id
```

### Créer des vaccinations

```javascript
// Récupérer un vaccin
const bcg = db.vaccines.findOne({ name: "BCG" })._id
const polio = db.vaccines.findOne({ name: /Polio/i })._id

// Vaccination pour agent A
db.vaccinations.insertOne({
  child: childA,
  vaccine: bcg,
  scheduledDate: new Date("2024-12-20T10:00:00Z"),
  status: "scheduled",
  doseNumber: 1,
  healthCenter: "Case de Santé Mbour",
  region: "Thiès",
  district: "District Thiès",
  givenBy: agentA,
  createdAt: new Date(),
  updatedAt: new Date()
})

// Vaccination pour agent B
db.vaccinations.insertOne({
  child: childB,
  vaccine: polio,
  scheduledDate: new Date("2024-12-21T14:00:00Z"),
  status: "scheduled",
  doseNumber: 1,
  healthCenter: "Poste de Santé Joal",
  region: "Thiès",
  district: "District Thiès",
  givenBy: agentB,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## Étape 2 : Tester Agent A

1. **Se connecter** :
   ```
   Email : agent.mbour@vacxcare.sn
   Mot de passe : agent123
   ```

2. **Aller dans Rendez-vous** : http://localhost:3000/agent/rendez-vous

3. **Vérifications** :
   - ✅ Message vert "Vue centre de santé : Case de Santé Mbour"
   - ✅ Voit 1 rendez-vous : BCG - Fatou Sow
   - ✅ Ne voit PAS : Polio - Amadou Fall (autre agent)
   - ✅ Toutes les actions disponibles (Fait, Raté, Annuler)
   - ✅ Pas de filtres District/Acteurs
   - ✅ Pas de badges de type
   - ✅ Pas de statistiques District/Acteurs

4. **Logs backend attendus** :
   ```
   🔍 === DEBUG getAppointments ===
   User role: agent
   User healthCenter: Case de Santé Mbour
   👤 AGENT : Filtrage par healthCenter uniquement: Case de Santé Mbour
   📊 Vaccinations trouvées: 1
   ```

## Étape 3 : Tester Agent B

1. **Se connecter** :
   ```
   Email : agent.joal@vacxcare.sn
   Mot de passe : agent123
   ```

2. **Aller dans Rendez-vous**

3. **Vérifications** :
   - ✅ Message vert "Vue centre de santé : Poste de Santé Joal"
   - ✅ Voit 1 rendez-vous : Polio - Amadou Fall
   - ✅ Ne voit PAS : BCG - Fatou Sow (autre agent)
   - ✅ Toutes les actions disponibles

4. **Logs backend attendus** :
   ```
   👤 AGENT : Filtrage par healthCenter uniquement: Poste de Santé Joal
   📊 Vaccinations trouvées: 1
   ```

## Étape 4 : Tester District

1. **Se connecter avec un compte district** :
   ```
   Email : district.thies@vacxcare.sn
   ```

2. **Vérifications** :
   - ✅ Message bleu "Vue district"
   - ✅ Voit 2 rendez-vous : BCG (Mbour) + Polio (Joal)
   - ✅ Statistiques : "Mes rendez-vous (0)" + "Rendez-vous acteurs (2)"
   - ✅ Filtres District/Acteurs disponibles
   - ✅ Badges "Acteur" sur les 2 rendez-vous
   - ✅ Actions DÉSACTIVÉES (grisées) pour les 2
   - ✅ Tooltip "Actions non disponibles pour les rendez-vous des acteurs"

3. **Logs backend attendus** :
   ```
   Paramètre district reçu: District Thiès
   📍 Centres trouvés pour district "District Thiès": 3
   📊 Vaccinations trouvées: 2
   ```

## Étape 5 : Test d'isolation complète

### Créer une vaccination directement au district

```javascript
const districtUser = db.users.findOne({ email: "district.thies@vacxcare.sn" })._id

db.children.insertOne({
  name: "Marie Diop",
  gender: "female",
  birthDate: new Date("2024-03-10"),
  parentPhone: "+221770000003",
  healthCenter: "District Thiès",
  region: "Thiès",
  district: "District Thiès",
  registeredBy: districtUser,
  createdAt: new Date(),
  updatedAt: new Date()
})

const childDistrict = db.children.findOne({ name: "Marie Diop" })._id
const ror = db.vaccines.findOne({ name: /ROR/i })._id

db.vaccinations.insertOne({
  child: childDistrict,
  vaccine: ror,
  scheduledDate: new Date("2024-12-22T09:00:00Z"),
  status: "scheduled",
  doseNumber: 1,
  healthCenter: "District Thiès",
  region: "Thiès",
  district: "District Thiès",
  givenBy: districtUser,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Re-tester Agent A

- ✅ Voit toujours 1 rendez-vous (BCG - Fatou)
- ✅ Ne voit PAS ROR - Marie (district)

### Re-tester Agent B

- ✅ Voit toujours 1 rendez-vous (Polio - Amadou)
- ✅ Ne voit PAS ROR - Marie (district)

### Re-tester District

- ✅ Voit 3 rendez-vous : BCG (Mbour) + Polio (Joal) + ROR (District)
- ✅ Statistiques : "Mes rendez-vous (1)" + "Rendez-vous acteurs (2)"
- ✅ Badge "District" sur ROR → Actions ACTIVES
- ✅ Badges "Acteur" sur BCG + Polio → Actions DÉSACTIVÉES

## Résultat attendu final

| Utilisateur      | Rendez-vous visibles                     | Actions disponibles     |
|------------------|------------------------------------------|-------------------------|
| Agent A (Mbour)  | BCG - Fatou (1)                         | ✅ Tous                 |
| Agent B (Joal)   | Polio - Amadou (1)                      | ✅ Tous                 |
| District Thiès   | BCG + Polio + ROR (3)                   | ✅ ROR, ❌ BCG + Polio  |

## Checklist de validation

- [ ] Agent A voit uniquement ses rendez-vous
- [ ] Agent B voit uniquement ses rendez-vous
- [ ] Agents ne voient pas les rendez-vous des autres agents
- [ ] Agents ne voient pas les rendez-vous du district
- [ ] Agents peuvent agir sur tous leurs rendez-vous
- [ ] District voit tous les rendez-vous
- [ ] District peut agir uniquement sur ses propres rendez-vous
- [ ] District ne peut que consulter les rendez-vous des acteurs
- [ ] Messages d'info corrects pour chaque rôle
- [ ] Filtres et badges uniquement pour district
- [ ] Logs backend corrects

---

**Si tous les tests passent** ✅ : L'isolation est fonctionnelle !
