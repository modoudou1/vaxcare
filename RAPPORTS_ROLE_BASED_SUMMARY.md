# 📊 Rapports basés sur les rôles - Résumé complet

## Vue d'ensemble

Les écrans de rapports ont été configurés pour afficher des statistiques adaptées à chaque rôle avec la logique d'agrégation appropriée.

## 🎯 Logique par rôle

### 1. 👤 AGENT (Acteur de santé)
**URL** : `http://localhost:3000/agent/reports`  
**Endpoint API** : `GET /api/stats/agent`

#### Données affichées
- ✅ **Ses propres vaccinations** uniquement (filtre par `givenBy: userId`)
- ✅ Stocks de **son centre** uniquement
- ✅ Activité récente de **ses vaccinations**
- ✅ Tendance mensuelle de **ses vaccinations**

#### Message affiché
> "Statistiques et performance de votre centre de santé"

#### Exemple
```
Agent : Case de Santé Mbour
Voit :
- Total vaccinations : 45 (ses propres vaccinations)
- Ce mois : 12
- Cette semaine : 3
- Stocks : Case de Santé Mbour uniquement
- Activité : Ses 5 dernières vaccinations
```

---

### 2. 🏛️ DISTRICT
**URL** : `http://localhost:3000/agent/reports`  
**Endpoint API** : `GET /api/stats/agent`

#### Données affichées
- ✅ **Toutes les vaccinations du district** (district + acteurs)
- ✅ Agrégation de tous les centres du district
- ✅ Stocks de **tous les centres** du district
- ✅ Activité récente de **tout le district**
- ✅ Tendance mensuelle **agrégée**

#### Message affiché
> "Statistiques agrégées de votre district (vos activités + acteurs de santé)"

#### Logique backend
```typescript
// Trouver tous les centres du district
const centersInDistrict = await HealthCenter.find({
  $or: [
    { name: healthCenterId, type: "district" },
    { districtName: healthCenterId },
  ],
});

// Filtrer les vaccinations
vaccinationFilter = {
  status: "done",
  $or: [
    { district: healthCenterId },
    { healthCenter: { $in: centerNames } },
  ],
};
```

#### Exemple
```
District : District Thiès
Voit :
- Total vaccinations : 250 (district + tous acteurs)
  - District Thiès : 50
  - Case de Santé Mbour : 45
  - Poste de Santé Joal : 80
  - Clinique Thiès : 75
- Stocks : Agrégation de tous les centres
- Activité : 5 dernières vaccinations (tous centres)
```

---

### 3. 🌍 RÉGIONAL
**URL** : `http://localhost:3000/regional/reports`  
**Endpoint API** : `GET /api/stats/regional`

#### Données affichées
- ✅ **Tous les districts de la région**
- ✅ Performance **par district** (pas par centre individuel)
- ✅ Chaque ligne du tableau = 1 district avec agrégation (district + acteurs)
- ✅ Statistiques globales de la région

#### Message affiché
> "Vue d'ensemble de la performance de votre région (par district)"

#### Tableau "Performance par district"
| District | Vaccinations | Couverture | Performance | État stock |
|----------|--------------|------------|-------------|------------|
| District Thiès | 250 | 85% | ████████ | Bon |
| District Dakar | 450 | 92% | ███████████ | Attention |
| District Mbour | 180 | 78% | ██████ | Critique |

#### Logique backend
```typescript
// Trouver tous les districts de la région
const districts = await HealthCenter.find({ 
  region: regionId,
  type: "district"
});

// Pour chaque district, agréger district + acteurs
for (const district of districts) {
  const centersInDistrict = await HealthCenter.find({
    $or: [
      { name: districtName, type: "district" },
      { districtName: districtName },
    ],
  });
  
  const vaccinations = await Vaccination.countDocuments({
    status: "done",
    $or: [
      { district: districtName },
      { healthCenter: { $in: centerNames } },
    ],
  });
}
```

#### Exemple
```
Régional : Thiès
Voit :
- 3 districts actifs
- Total vaccinations : 880 (tous districts)
- Taux de couverture : 85%
- Tableau :
  - District Thiès : 250 vaccinations (district + acteurs)
  - District Dakar : 450 vaccinations (district + acteurs)
  - District Mbour : 180 vaccinations (district + acteurs)
```

---

## 📋 Résumé des modifications

### Backend (`statsController.ts`)

#### `getAgentStats`
- ✅ Ajout détection du rôle (`agent` vs `district`)
- ✅ Filtre par `givenBy` pour agents
- ✅ Agrégation par district pour districts
- ✅ Logs détaillés pour debug

#### `getRegionalStats`
- ✅ Modification pour afficher par **district** au lieu de par centre
- ✅ Agrégation district + acteurs pour chaque district
- ✅ Tableau "Performance par district"

### Frontend

#### `/agent/reports/page.tsx`
- ✅ Message adapté selon le rôle (agent vs district)
- ✅ Appel à `/api/stats/agent` pour les deux rôles

#### `/regional/reports/page.tsx`
- ✅ Titre changé : "Performance par district (district + acteurs de santé)"
- ✅ Colonne "District" au lieu de "Centre"
- ✅ Message "Districts actifs" au lieu de "Centres de santé actifs"
- ✅ Sous-titre : "Vue d'ensemble de la performance de votre région (par district)"

### Routes (`stats.ts`)
- ✅ Autorisation du rôle "district" sur `/api/stats/agent`

---

## 🧪 Test

### Test Agent
```bash
# Se connecter en tant qu'agent
Email : agent.mbour@vacxcare.sn
URL : http://localhost:3000/agent/reports

Vérifications :
✅ Voit uniquement ses propres vaccinations
✅ Stocks de son centre uniquement
✅ Message : "Statistiques et performance de votre centre de santé"
```

### Test District
```bash
# Se connecter en tant que district
Email : district.thies@vacxcare.sn
URL : http://localhost:3000/agent/reports

Vérifications :
✅ Voit toutes les vaccinations du district (district + acteurs)
✅ Stocks de tous les centres du district
✅ Message : "Statistiques agrégées de votre district (vos activités + acteurs de santé)"
✅ Nombre de vaccinations > nombre de vaccinations d'un seul agent
```

### Test Régional
```bash
# Se connecter en tant que régional
Email : regional.thies@vacxcare.sn
URL : http://localhost:3000/regional/reports

Vérifications :
✅ Tableau affiche les districts (pas les centres individuels)
✅ Chaque ligne = 1 district avec agrégation
✅ Colonne "District" dans le tableau
✅ Message : "Vue d'ensemble de la performance de votre région (par district)"
✅ KPI : "Districts actifs" au lieu de "Centres de santé actifs"
```

---

## 📊 Schéma de flux

```
┌─────────────────────────────────────────────────────────────┐
│                    RAPPORTS D'ACTIVITÉ                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  👤 AGENT "Case de Santé Mbour"                             │
│  ─────────────────────────────────                           │
│  Endpoint : GET /api/stats/agent                             │
│  Filtre : givenBy = userId                                   │
│  Voit : Ses propres vaccinations uniquement                  │
│  Total : 45 vaccinations                                     │
│                                                               │
│  🏛️ DISTRICT "District Thiès"                               │
│  ────────────────────────────                                │
│  Endpoint : GET /api/stats/agent                             │
│  Filtre : district = "District Thiès" OU                     │
│           healthCenter IN [centres du district]              │
│  Voit : District + tous acteurs                              │
│  Total : 250 vaccinations (agrégation)                       │
│                                                               │
│  🌍 RÉGIONAL "Thiès"                                         │
│  ──────────────────                                          │
│  Endpoint : GET /api/stats/regional                          │
│  Affichage : Par district (pas par centre)                   │
│  Tableau :                                                    │
│    - District Thiès : 250 (district + acteurs)               │
│    - District Dakar : 450 (district + acteurs)               │
│    - District Mbour : 180 (district + acteurs)               │
│  Total région : 880 vaccinations                             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Points clés

1. **Agent** : Voit uniquement ses propres données (filtre strict par `givenBy`)
2. **District** : Voit l'agrégation de son district (district + acteurs)
3. **Régional** : Voit les districts de sa région (pas les centres individuels)
4. **Agrégation district** : Toujours district + acteurs de santé sous sa supervision
5. **Messages adaptés** : Chaque rôle a un message explicatif approprié

---

**Date** : 17 novembre 2024  
**Version** : 1.0.0  
**Fonctionnalité** : Rapports basés sur les rôles avec agrégation
