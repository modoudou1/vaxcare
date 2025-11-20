# 🧪 Guide de Test - Flux Complet avec Données Réelles

Ce guide vous permet de tester le flux complet de l'inscription à la sélection des vaccins jusqu'au dashboard, **avec uniquement des données réelles** (pas de mock).

---

## ⚙️ ÉTAPE 1: Préparation du Backend

### 1.1 Démarrer le Backend

```bash
cd /Users/macretina/Vacxcare/vacxcare-backend
npm run dev
```

**Vérifications:**
- ✅ Le serveur démarre sur `http://localhost:5000`
- ✅ MongoDB est connecté
- ✅ Message: `✅ Connexion MongoDB réussie!`

### 1.2 Vérifier le Calendrier Vaccinal en Base

**Option A: Via MongoDB Compass**
1. Connectez-vous à votre MongoDB
2. Sélectionnez la base de données `vacxcare`
3. Ouvrez la collection `vaccinecalendars`
4. Vérifiez qu'il y a des données

**Option B: Via le terminal**
```bash
# Dans un autre terminal
mongosh
use vacxcare
db.vaccinecalendars.countDocuments()
```

**Résultat attendu:** Un nombre > 0 (par exemple: 15-20 entrées)

### 1.3 Ajouter des Données si Vides

Si le calendrier est vide, ajoutez des données de test:

```bash
# Dans mongosh
use vacxcare

db.vaccinecalendars.insertMany([
  {
    vaccine: ["BCG"],
    dose: "1ère dose",
    ageUnit: "weeks",
    specificAge: 0,
    minAge: 0,
    maxAge: 0,
    description: "Vaccin contre la tuberculose",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    vaccine: ["HepB 0"],
    dose: "À la naissance",
    ageUnit: "weeks",
    specificAge: 0,
    minAge: 0,
    maxAge: 0,
    description: "Hépatite B naissance",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    vaccine: ["VPO 0"],
    dose: "À la naissance",
    ageUnit: "weeks",
    specificAge: 0,
    minAge: 0,
    maxAge: 0,
    description: "Vaccin polio oral naissance",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    vaccine: ["Penta 1", "VPO 1"],
    dose: "1ère dose",
    ageUnit: "weeks",
    specificAge: 6,
    minAge: 6,
    maxAge: 10,
    description: "Pentavalent + Polio",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    vaccine: ["Pneumo 1"],
    dose: "1ère dose",
    ageUnit: "weeks",
    specificAge: 6,
    minAge: 6,
    maxAge: 10,
    description: "Vaccin pneumocoque",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    vaccine: ["Rota 1"],
    dose: "1ère dose",
    ageUnit: "weeks",
    specificAge: 6,
    minAge: 6,
    maxAge: 10,
    description: "Vaccin rotavirus",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    vaccine: ["Penta 2", "VPO 2"],
    dose: "2ème dose",
    ageUnit: "weeks",
    specificAge: 10,
    minAge: 10,
    maxAge: 14,
    description: "Pentavalent + Polio",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    vaccine: ["Pneumo 2"],
    dose: "2ème dose",
    ageUnit: "weeks",
    specificAge: 10,
    minAge: 10,
    maxAge: 14,
    description: "Vaccin pneumocoque",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    vaccine: ["Rota 2"],
    dose: "2ème dose",
    ageUnit: "weeks",
    specificAge: 10,
    minAge: 10,
    maxAge: 14,
    description: "Vaccin rotavirus",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    vaccine: ["Penta 3", "VPO 3"],
    dose: "3ème dose",
    ageUnit: "weeks",
    specificAge: 14,
    minAge: 14,
    maxAge: 18,
    description: "Pentavalent + Polio",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    vaccine: ["Pneumo 3"],
    dose: "3ème dose",
    ageUnit: "weeks",
    specificAge: 14,
    minAge: 14,
    maxAge: 18,
    description: "Vaccin pneumocoque",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    vaccine: ["RR"],
    dose: "1ère dose",
    ageUnit: "months",
    specificAge: 9,
    minAge: 9,
    maxAge: 12,
    description: "Rougeole-Rubéole",
    createdAt: new Date(),
    updatedAt: new Date()
  }
])
```

---

## 📱 ÉTAPE 2: Démarrer le Mobile

### 2.1 Lancer l'Application

```bash
cd /Users/macretina/Vacxcare/vacxcare_mobile
flutter run -d chrome
```

### 2.2 Vérifications au Démarrage

**Console Flutter:**
- ✅ Pas de message "Using mock data"
- ✅ Message: "🔑 Token récupéré..."
- ✅ Connexion Socket.io réussie

---

## 🧪 ÉTAPE 3: Test du Flux Complet

### 3.1 Inscription Parent

1. **Cliquez sur "S'inscrire"**
2. **Remplissez le formulaire:**
   - Nom parent: `Test Parent`
   - Téléphone: `771234567`
   - Prénom enfant: `Fatou`
   - Nom enfant: `Diop`
   - Date de naissance: `15/10/2024` (3 mois)
   - Sexe: `F`

3. **Cliquez "S'inscrire"**

**Backend doit afficher:**
```
📱 Nouvel enfant créé: ...
👶 Âge de l'enfant: 3 mois
```

### 3.2 Vérification Code & PIN

1. **Entrez le code à 6 chiffres** (affiché dans les logs backend)
2. **Créez un PIN** (ex: 1234)

### 3.3 Sélection des Vaccins (CRITIQUE)

**Console Flutter doit afficher:**
```
👶 Âge de l'enfant: 3 mois (90 jours)
📋 Total vaccins dans le calendrier: 12

💉 Vaccin: BCG - Âge: 0 weeks (0.0 mois) - ✅ INCLUS
💉 Vaccin: HepB 0 - Âge: 0 weeks (0.0 mois) - ✅ INCLUS
💉 Vaccin: VPO 0 - Âge: 0 weeks (0.0 mois) - ✅ INCLUS
💉 Vaccin: Penta 1, VPO 1 - Âge: 6 weeks (1.4 mois) - ✅ INCLUS
💉 Vaccin: Pneumo 1 - Âge: 6 weeks (1.4 mois) - ✅ INCLUS
💉 Vaccin: Rota 1 - Âge: 6 weeks (1.4 mois) - ✅ INCLUS
💉 Vaccin: Penta 2, VPO 2 - Âge: 10 weeks (2.3 mois) - ✅ INCLUS
💉 Vaccin: Pneumo 2 - Âge: 10 weeks (2.3 mois) - ✅ INCLUS
💉 Vaccin: Rota 2 - Âge: 10 weeks (2.3 mois) - ✅ INCLUS
💉 Vaccin: Penta 3, VPO 3 - Âge: 14 weeks (3.2 mois) - ❌ EXCLU
💉 Vaccin: Pneumo 3 - Âge: 14 weeks (3.2 mois) - ❌ EXCLU

✅ Vaccins pertinents trouvés: 9

📅 Nouvelle période d'âge: À la naissance
   ➕ Ajout vaccin: BCG (1ère dose)
   ➕ Ajout vaccin: HepB 0 (À la naissance)
   ➕ Ajout vaccin: VPO 0 (À la naissance)

📅 Nouvelle période d'âge: 6 semaines
   ➕ Ajout vaccin: Penta 1 (1ère dose)
   ➕ Ajout vaccin: VPO 1 (1ère dose)
   ➕ Ajout vaccin: Pneumo 1 (1ère dose)
   ➕ Ajout vaccin: Rota 1 (1ère dose)

📅 Nouvelle période d'âge: 10 semaines
   ➕ Ajout vaccin: Penta 2 (2ème dose)
   ➕ Ajout vaccin: VPO 2 (2ème dose)
   ➕ Ajout vaccin: Pneumo 2 (2ème dose)
   ➕ Ajout vaccin: Rota 2 (2ème dose)

📊 Résumé des périodes:
   À la naissance: 3 vaccin(s)
   6 semaines: 4 vaccin(s)
   10 semaines: 4 vaccin(s)
```

**Interface Mobile:**
```
┌─────────────────────────────────────┐
│  Progression globale        0%      │
│  ░░░░░░░░░░░░░░░░░░░       0/11    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  💉 À la naissance                  │
│  Période 1 / 3                      │
└─────────────────────────────────────┘

Vaccins de cette période  0 / 3
░░░░░░░░░░░░░░░░░░░░░░░░  0%

☐ BCG
   1ère dose

☐ HepB 0
   À la naissance

☐ VPO 0
   À la naissance

[Suivant →]
```

### 3.4 Sélectionner Quelques Vaccins

**Scénario de test:**
1. **Période "À la naissance"**
   - ✅ Cochez BCG
   - ✅ Cochez HepB 0
   - ❌ Laissez VPO 0 vide (pour tester "missed")
   - Cliquez "Suivant"

2. **Période "6 semaines"**
   - ✅ Cochez Penta 1
   - ✅ Cochez VPO 1
   - ❌ Laissez Pneumo 1 vide
   - ❌ Laissez Rota 1 vide
   - Cliquez "Suivant"

3. **Période "10 semaines"**
   - ❌ Laissez tout vide
   - Cliquez "Terminer"

### 3.5 Vérification Backend

**Backend doit afficher:**
```
📋 Marquage de 4 vaccins comme faits pour l'enfant 674...
👶 Âge de l'enfant: 3 mois
📅 Vaccins pertinents trouvés: 3 périodes

✅ 4 vaccinations créées comme "done"
⚠️ 7 vaccinations créées comme "missed"
```

### 3.6 Vérification Base de Données

```bash
# Dans mongosh
use vacxcare
db.vaccinations.find({ child: ObjectId("674...") }).pretty()
```

**Résultat attendu:**
```javascript
// 11 documents au total
{ vaccineName: "BCG", status: "done", ... }
{ vaccineName: "HepB 0", status: "done", ... }
{ vaccineName: "VPO 0", status: "missed", ... }  // ⚠️ RATÉ
{ vaccineName: "Penta 1", status: "done", ... }
{ vaccineName: "VPO 1", status: "done", ... }
{ vaccineName: "Pneumo 1", status: "missed", ... }  // ⚠️ RATÉ
{ vaccineName: "Rota 1", status: "missed", ... }  // ⚠️ RATÉ
{ vaccineName: "Penta 2", status: "missed", ... }  // ⚠️ RATÉ
{ vaccineName: "VPO 2", status: "missed", ... }  // ⚠️ RATÉ
{ vaccineName: "Pneumo 2", status: "missed", ... }  // ⚠️ RATÉ
{ vaccineName: "Rota 2", status: "missed", ... }  // ⚠️ RATÉ
```

---

## 📊 ÉTAPE 4: Vérification Dashboard

### 4.1 Stats Affichées

Le dashboard doit afficher:

```
┌─────────────────┬─────────────────┐
│  Vaccins faits  │  Vaccins ratés  │
│       4         │       7         │
│  Sur 11         │  À rattraper    │
└─────────────────┴─────────────────┘

┌─────────────────┬─────────────────┐
│    Restants     │  Rendez-vous    │
│       7         │       0         │
│    À faire      │    À venir      │
└─────────────────┴─────────────────┘
```

### 4.2 Console Backend - Endpoint Stats

```
GET /api/mobile/children/674.../stats 200

📊 Stats enfant 674...:
{
  totalVaccines: 11,
  completedVaccines: 4,
  missedVaccines: 7,
  remainingVaccines: 7,
  scheduledVaccines: 0,
  overdueVaccines: 0
}
```

### 4.3 Activité Récente

Le dashboard doit afficher:

```
📈 ACTIVITÉ RÉCENTE

⚠️ Vaccin Rota 2 raté
   Il y a quelques instants

⚠️ Vaccin Pneumo 2 raté
   Il y a quelques instants

⚠️ Vaccin VPO 2 raté
   Il y a quelques instants

✅ Vaccin VPO 1 administré
   Il y a quelques instants

✅ Vaccin Penta 1 administré
   Il y a quelques instants
```

---

## 💉 ÉTAPE 5: Vérification Écran Vaccinations

### 5.1 Aller dans l'onglet "Vaccins"

Cliquez sur l'icône Vaccins dans la navigation

### 5.2 Onglet "Tous"

Doit afficher **11 vaccins**

### 5.3 Onglet "Faits" ✅

Doit afficher **4 vaccins:**
- BCG
- HepB 0
- Penta 1
- VPO 1

### 5.4 Onglet "Ratés" ⚠️

Doit afficher **7 vaccins:**
- VPO 0
- Pneumo 1
- Rota 1
- Penta 2
- VPO 2
- Pneumo 2
- Rota 2

---

## ✅ CHECKLIST DE VALIDATION

### Backend
- [ ] Calendrier vaccinal en base (> 0 documents)
- [ ] Endpoint `/api/vaccine-calendar` retourne les vaccins
- [ ] Logs montrent l'âge calculé de l'enfant
- [ ] Logs montrent les vaccins filtrés par âge
- [ ] Logs montrent la création de vaccinations "done" et "missed"
- [ ] Base de données contient les vaccinations créées

### Frontend Mobile
- [ ] Aucun message "Using mock data" dans la console
- [ ] Logs montrent le calendrier chargé depuis l'API
- [ ] Logs montrent les vaccins groupés par période
- [ ] Interface affiche les bonnes périodes selon l'âge
- [ ] Chaque vaccin est affiché séparément
- [ ] Animation de félicitations quand période complète
- [ ] Stats dashboard affichent les vraies données
- [ ] Activité récente affiche done + missed
- [ ] Écran Vaccinations filtre correctement

### Flux Complet
- [ ] Inscription → Sélection → Dashboard sans erreur
- [ ] Vaccins cochés = status "done" en base
- [ ] Vaccins non cochés = status "missed" en base
- [ ] Dashboard affiche les bonnes statistiques
- [ ] Activité affiche done ET missed
- [ ] Écran Vaccinations affiche les bons onglets

---

## 🐛 Dépannage

### Erreur "Using mock data"
**Cause:** Backend non démarré ou inaccessible
**Solution:** 
```bash
cd vacxcare-backend
npm run dev
```

### Aucun vaccin affiché
**Cause:** Calendrier vaccinal vide en base
**Solution:** Exécutez le script d'insertion de l'ÉTAPE 1.3

### Vaccins non filtrés par âge
**Cause:** Logs backend montrent tous les vaccins "INCLUS"
**Solution:** Vérifiez la date de naissance de l'enfant

### Stats = 0/0/0
**Cause:** Aucune vaccination créée en base
**Solution:** Vérifiez les logs backend lors de la sélection

---

## 📝 Notes Importantes

1. **Pas de Mock:** Le système n'utilise PLUS de données mock. Si le backend est down, l'app mobile affichera une erreur.

2. **Données Réelles:** Toutes les données viennent de :
   - `vaccinecalendars` → Calendrier national
   - `children` → Enfants inscrits
   - `vaccinations` → Historique vaccinal

3. **Synchronisation:** Tout est lié en temps réel via Socket.io

4. **Logs Complets:** Tous les logs permettent de tracer le flux de A à Z

---

## 🎯 Résultat Final Attendu

Après avoir suivi ce guide, vous devez avoir :

1. ✅ Un calendrier vaccinal réel en base de données
2. ✅ Un enfant inscrit avec son âge calculé
3. ✅ Des vaccinations "done" pour ceux cochés
4. ✅ Des vaccinations "missed" pour ceux non cochés
5. ✅ Un dashboard affichant les vraies statistiques
6. ✅ Une activité récente montrant done + missed
7. ✅ Un écran Vaccinations avec filtres fonctionnels

**Tout est connecté et fonctionne avec de VRAIES données !** 🚀
