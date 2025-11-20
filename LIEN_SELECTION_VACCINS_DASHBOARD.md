# 🔗 Lien entre Sélection des Vaccins et Dashboard Mobile

Ce document explique comment la sélection des vaccins lors de l'inscription est liée au dashboard et aux fonctionnalités de vaccination.

## 📋 Vue d'Ensemble du Flux Complet

```
┌──────────────────┐
│  INSCRIPTION     │
│  Parent Mobile   │
└────────┬─────────┘
         │
         │ 1. Saisie infos enfant
         │    + Date de naissance
         ▼
┌──────────────────────────┐
│ SÉLECTION DES VACCINS    │
│ (Par périodes d'âge)     │
└────────┬─────────────────┘
         │
         │ 2. Pour chaque période:
         │    • Affiche vaccins pertinents
         │    • Parent coche fait ✓
         │    • Parent laisse vide = raté ✗
         ▼
┌──────────────────────────┐
│ BACKEND                  │
│ /mark-vaccines-done      │
└────────┬─────────────────┘
         │
         │ 3. Crée vaccinations:
         │    • Cochés → status: "done"
         │    • Non cochés → status: "missed"
         ▼
┌──────────────────────────┐
│ BASE DE DONNÉES          │
│ Collection: vaccinations │
└────────┬─────────────────┘
         │
         │ 4. Stats récupérées
         ▼
┌──────────────────────────┐
│ DASHBOARD MOBILE         │
│ • Vaccins faits          │
│ • Vaccins ratés          │
│ • Vaccins restants       │
│ • Calendrier             │
│ • Statistiques           │
└──────────────────────────┘
```

---

## 🎯 1. Sélection des Vaccins (Inscription)

### Frontend: `improved_vaccine_selection_screen.dart`

**Étapes:**

1. **Calcul de l'âge de l'enfant**
   ```dart
   int ageInMonths = (difference.inDays / 30.44).floor();
   ```

2. **Récupération du calendrier vaccinal**
   ```dart
   GET /api/vaccine-calendar
   ```

3. **Filtrage par âge**
   - Convertit toutes les périodes en mois
   - Ne garde que les vaccins jusqu'à l'âge actuel
   - Groupe par période d'âge

4. **Affichage séparé de chaque vaccin**
   ```
   📅 À la naissance
   ☐ BCG
   ☐ HepB 0
   ☐ VPO 0
   
   📅 6 semaines
   ☐ Penta 1
   ☐ VPO 1
   ☐ Pneumo 1
   ☐ Rota 1
   ```

5. **Sélection et sauvegarde**
   ```dart
   POST /api/mobile/children/:id/mark-vaccines-done
   {
     "vaccines": [
       "calendarId_BCG",
       "calendarId_HepB 0",
       // ... vaccins cochés
     ]
   }
   ```

---

## 🔧 2. Backend: Traitement Intelligent

### Endpoint: `POST /api/mobile/children/:id/mark-vaccines-done`

**Localisation:** `vacxcare-backend/src/routes/mobile.ts` (ligne 1273)

**Logique:**

1. **Calcule l'âge de l'enfant**
   ```typescript
   const ageInMonths = Math.floor(
     (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
   );
   ```

2. **Récupère TOUS les vaccins pertinents**
   ```typescript
   const allCalendar = await VaccineCalendar.find({}).lean();
   const relevantCalendar = allCalendar.filter(entry => {
     // Filtre par âge...
     return vaccineAgeInMonths <= ageInMonths;
   });
   ```

3. **Pour CHAQUE vaccin pertinent:**

   **SI COCHÉ (dans la liste envoyée):**
   ```typescript
   {
     child: childId,
     vaccineName: "BCG",
     dose: "1ère dose",
     status: "done", // ✅ Fait
     doneDate: new Date(),
     administeredDate: new Date(),
     notes: "Vaccin déjà fait avant inscription"
   }
   ```

   **SI NON COCHÉ (absent de la liste):**
   ```typescript
   {
     child: childId,
     vaccineName: "Penta 2",
     dose: "2ème dose",
     status: "missed", // ❌ Raté
     notes: "Vaccin non fait lors de l'inscription"
   }
   ```

4. **Sauvegarde en masse**
   ```typescript
   await Vaccination.insertMany(vaccinationsToCreate);
   ```

5. **Retourne le résumé**
   ```json
   {
     "success": true,
     "done": 5,
     "missed": 3,
     "total": 8,
     "message": "5 vaccin(s) marqué(s) comme faits, 3 vaccin(s) marqué(s) comme ratés"
   }
   ```

---

## 📊 3. Statistiques Dashboard

### Endpoint: `GET /api/mobile/children/:id/stats`

**Retourne:**
```json
{
  "totalVaccines": 8,
  "completedVaccines": 5,
  "missedVaccines": 3,
  "remainingVaccines": 3,
  "scheduledVaccines": 0,
  "overdueVaccines": 0
}
```

### Affichage Dashboard Mobile

**Fichier:** `modern_dashboard_screen.dart`

```dart
┌─────────────────┬─────────────────┐
│  Vaccins faits  │  Vaccins ratés  │
│       5         │       3         │
│  Sur 8          │  À rattraper    │
└─────────────────┴─────────────────┘

┌─────────────────┬─────────────────┐
│    Restants     │  Rendez-vous    │
│       3         │       2         │
│    À faire      │    À venir      │
└─────────────────┴─────────────────┘
```

**Variables:**
- `_totalVaccines`: 8
- `_completedVaccines`: 5 ✅
- `_missedVaccines`: 3 ⚠️
- `_remainingVaccines`: 3 📋

---

## 📱 4. Écran Vaccinations

### Endpoint: `GET /api/mobile/children/:id/vaccinations`

**Fichier:** `vaccination_list_screen.dart`

**Onglets:**
1. **Tous** : Affiche tous les vaccins
2. **Faits** : `status === 'done'` ✅
3. **Programmés** : `status === 'scheduled'` 📅
4. **Ratés** : `status === 'missed'` ⚠️
5. **En retard** : `status === 'overdue'` 🔴

**Affichage d'un vaccin raté:**
```dart
VaccineCard(
  name: "Penta 2",
  status: "missed", // 🔴 Badge rouge
  dose: "2ème dose",
  ageRecommended: "10 semaines",
  note: "Vaccin non fait lors de l'inscription"
)
```

---

## 📈 5. Activité Récente

### Endpoint: `GET /api/mobile/children/:id/activity`

**Retourne les 10 dernières activités:**

```json
[
  {
    "type": "vaccination",
    "status": "done",
    "title": "Vaccin BCG administré",
    "date": "2025-01-15T10:30:00Z"
  },
  {
    "type": "vaccination",
    "status": "missed",
    "title": "Vaccin Penta 2 raté",
    "date": "2025-01-15T10:30:00Z"
  },
  {
    "type": "appointment",
    "status": "scheduled",
    "title": "Rendez-vous Penta 3 programmé",
    "date": "2025-02-01T14:00:00Z"
  }
]
```

**Affichage sur le Dashboard:**
- ✅ **Icône verte** pour "done"
- ⚠️ **Icône orange** pour "missed"
- 📅 **Icône bleue** pour "scheduled"

---

## 🔄 6. Synchronisation Temps Réel

### Socket.io

**Événement:** `newNotification`

Quand un vaccin est :
- Marqué comme "done" par l'agent → Notification + Refresh dashboard
- Marqué comme "missed" par l'agent → Notification + Refresh dashboard
- Programmé → Notification + Refresh calendrier

```dart
socket.on('newNotification', (data) {
  if (data['type'] == 'vaccination') {
    _loadDashboardData(); // Recharge les stats
  }
});
```

---

## 🎯 7. Calendrier Vaccinal

### Écran: `calendrier_screen.dart`

**Affiche:**
- ✅ **Vaccins faits** (vert)
- ⚠️ **Vaccins ratés** (orange)
- 📅 **Vaccins programmés** (bleu)
- 🔴 **Vaccins en retard** (rouge)

**Timeline visuelle:**
```
À la naissance
  ✅ BCG (fait)
  ✅ HepB 0 (fait)
  ✅ VPO 0 (fait)

6 semaines
  ✅ Penta 1 (fait)
  ✅ VPO 1 (fait)
  ⚠️ Pneumo 1 (raté)
  ⚠️ Rota 1 (raté)

10 semaines
  ⚠️ Penta 2 (raté)
  📅 VPO 2 (programmé)
  📅 Pneumo 2 (programmé)
```

---

## 🔍 8. Exemple de Flux Complet

### Scénario: Enfant de 3 mois (90 jours)

#### Étape 1: Inscription

Parent inscrit l'enfant né le 15/10/2024

#### Étape 2: Sélection des vaccins

**Périodes affichées:**
- À la naissance (0 semaines)
- 6 semaines
- 10 semaines

**Parent sélectionne:**
- ✅ BCG
- ✅ HepB 0
- ✅ VPO 0
- ✅ Penta 1
- ✅ VPO 1
- ❌ Pneumo 1 (non coché)
- ❌ Rota 1 (non coché)
- ❌ Penta 2 (non coché)

#### Étape 3: Backend crée

**Vaccinations "done" (5):**
1. BCG - À la naissance
2. HepB 0 - À la naissance
3. VPO 0 - À la naissance
4. Penta 1 - 6 semaines
5. VPO 1 - 6 semaines

**Vaccinations "missed" (3):**
1. Pneumo 1 - 6 semaines
2. Rota 1 - 6 semaines
3. Penta 2 - 10 semaines

#### Étape 4: Dashboard affiche

```
┌─────────────────┬─────────────────┐
│  Vaccins faits  │  Vaccins ratés  │
│       5         │       3         │
│  Sur 8          │  À rattraper    │
└─────────────────┴─────────────────┘

Activité récente:
  ⚠️ Vaccin Penta 2 raté
  ⚠️ Vaccin Rota 1 raté
  ⚠️ Vaccin Pneumo 1 raté
  ✅ Vaccin VPO 1 administré
  ✅ Vaccin Penta 1 administré
```

---

## ✅ Résumé: Tout est Connecté

1. **Sélection de vaccins** → Envoie les vaccins cochés au backend
2. **Backend** → Crée "done" pour cochés + "missed" pour non cochés
3. **Stats** → Compte done, missed, remaining
4. **Dashboard** → Affiche toutes les stats
5. **Vaccinations** → Liste avec filtres par statut
6. **Calendrier** → Timeline visuelle avec couleurs
7. **Activité** → Historique done + missed
8. **Notifications** → Temps réel via Socket.io

**Aucun vaccin n'est perdu** : Tout est tracé et affiché ! 🎯
