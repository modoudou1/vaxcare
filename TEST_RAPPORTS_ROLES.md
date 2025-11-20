# 🧪 Test des rapports par rôle

## Objectif
Vérifier que chaque rôle voit les bonnes données dans les rapports.

## Pré-requis
- Backend démarré : `cd vacxcare-backend && npm run dev`
- Frontend démarré : `cd vacxcare-frontend && npm run dev`
- Données de test créées (agents, districts, vaccinations)

---

## Test 1 : Agent (Acteur de santé)

### Connexion
```
URL : http://localhost:3000/login
Email : agent.mbour@vacxcare.sn
Mot de passe : agent123
```

### Navigation
```
Aller à : http://localhost:3000/agent/reports
```

### Vérifications ✅

1. **Message d'en-tête** :
   - [ ] "Statistiques et performance de votre centre de santé"

2. **KPIs** :
   - [ ] Total vaccinations = Ses propres vaccinations uniquement
   - [ ] Ce mois = Ses vaccinations du mois
   - [ ] Cette semaine = Ses vaccinations de la semaine

3. **Stocks** :
   - [ ] Affiche uniquement les stocks de "Case de Santé Mbour"
   - [ ] Ne montre PAS les stocks des autres centres

4. **Activité récente** :
   - [ ] Affiche uniquement ses 5 dernières vaccinations
   - [ ] Toutes les vaccinations sont faites par lui

5. **Logs backend attendus** :
   ```
   📊 === getAgentStats ===
   User role: agent
   User healthCenter: Case de Santé Mbour
   👤 AGENT : Filtrage par givenBy
   ```

---

## Test 2 : District

### Connexion
```
URL : http://localhost:3000/login
Email : district.thies@vacxcare.sn
Mot de passe : district123
```

### Navigation
```
Aller à : http://localhost:3000/agent/reports
```

### Vérifications ✅

1. **Message d'en-tête** :
   - [ ] "Statistiques agrégées de votre district (vos activités + acteurs de santé)"

2. **KPIs** :
   - [ ] Total vaccinations = District + tous acteurs
   - [ ] Nombre > vaccinations d'un seul agent
   - [ ] Inclut les vaccinations de plusieurs centres

3. **Stocks** :
   - [ ] Affiche les stocks de TOUS les centres du district
   - [ ] Inclut : District Thiès, Case de Santé Mbour, Poste de Santé Joal, etc.

4. **Activité récente** :
   - [ ] Affiche les 5 dernières vaccinations de TOUT le district
   - [ ] Peut inclure des vaccinations de différents centres

5. **Tendance mensuelle** :
   - [ ] Agrégation de toutes les vaccinations du district

6. **Logs backend attendus** :
   ```
   📊 === getAgentStats ===
   User role: district
   User healthCenter: District Thiès
   🏛️ DISTRICT : Centres trouvés: 4
     - District Thiès
     - Case de Santé Mbour
     - Poste de Santé Joal
     - Clinique Thiès
   ```

---

## Test 3 : Régional

### Connexion
```
URL : http://localhost:3000/login
Email : regional.thies@vacxcare.sn
Mot de passe : regional123
```

### Navigation
```
Aller à : http://localhost:3000/regional/reports
```

### Vérifications ✅

1. **Message d'en-tête** :
   - [ ] "Vue d'ensemble de la performance de votre région (par district)"

2. **KPI "Districts actifs"** :
   - [ ] Affiche le nombre de districts (pas de centres)
   - [ ] Ne compte PAS les acteurs de santé (case, poste, clinique)
   - [ ] Compte uniquement les centres avec `type: "district"`
   - [ ] Exemple : 1 district actif (si 1 seul district dans la région)

3. **Tableau "Performance par district"** :
   - [ ] Colonne "District" (pas "Centre")
   - [ ] Chaque ligne = 1 district
   - [ ] Vaccinations = Agrégation district + acteurs
   - [ ] Exemple :
     ```
     District Thiès : 250 vaccinations
     District Dakar : 450 vaccinations
     District Mbour : 180 vaccinations
     ```

4. **Couverture par district** :
   - [ ] Pourcentage calculé sur district + acteurs
   - [ ] Barre de progression colorée selon le taux

5. **État des stocks** :
   - [ ] Agrégation des stocks de tous les centres du district
   - [ ] Statut : Bon / Attention / Critique

6. **Logs backend attendus** :
   ```
   🏛️ Found 3 districts in region Thiès
   🏛️ District District Thiès:
     centersFound: 4
     centers: [ 'District Thiès', 'Case de Santé Mbour', ... ]
   💉 District District Thiès: 250 vaccinations
   📊 District District Thiès coverage: 85%
   ```

---

## Comparaison des résultats

### Exemple avec données réelles

| Rôle | URL | Total Vaccinations | Détail |
|------|-----|-------------------|--------|
| **Agent Mbour** | `/agent/reports` | 45 | Ses propres vaccinations |
| **District Thiès** | `/agent/reports` | 250 | District (50) + Mbour (45) + Joal (80) + Clinique (75) |
| **Régional Thiès** | `/regional/reports` | 880 | District Thiès (250) + District Dakar (450) + District Mbour (180) |

### Vérification de cohérence

1. **Agent < District** :
   - [ ] Vaccinations agent Mbour (45) < Vaccinations district Thiès (250)

2. **District < Régional** :
   - [ ] Vaccinations district Thiès (250) < Vaccinations région Thiès (880)

3. **Somme des districts = Régional** :
   - [ ] 250 + 450 + 180 = 880 ✅

---

## Test de non-régression

### Agent ne voit PAS les autres agents
```bash
# Agent Mbour se connecte
# Voit : 45 vaccinations

# Agent Joal se connecte
# Voit : 80 vaccinations (différent !)

# Vérification :
✅ Agent Mbour ne voit PAS les 80 vaccinations de Joal
✅ Agent Joal ne voit PAS les 45 vaccinations de Mbour
```

### District voit TOUS les acteurs
```bash
# District Thiès se connecte
# Voit : 250 vaccinations

# Vérification :
✅ Inclut les 45 de Mbour
✅ Inclut les 80 de Joal
✅ Inclut les 75 de Clinique
✅ Inclut les 50 du district lui-même
```

### Régional voit par DISTRICT (pas par centre)
```bash
# Régional Thiès se connecte
# Tableau affiche :
  - District Thiès : 250
  - District Dakar : 450
  - District Mbour : 180

# Vérification :
✅ Ne montre PAS "Case de Santé Mbour" individuellement
✅ Ne montre PAS "Poste de Santé Joal" individuellement
✅ Montre uniquement les districts avec agrégation
```

### KPI "Districts actifs" compte uniquement les districts
```bash
# Région Thiès avec :
# - 1 district : "District Thiès" (type: "district")
# - 3 acteurs : "Case Mbour", "Poste Joal", "Clinique Thiès" (type: "case", "poste", "clinique")

# KPI affiché :
Districts actifs : 1 ✅

# Vérification :
✅ Ne compte PAS les 3 acteurs de santé
✅ Compte uniquement le district (type: "district")
✅ Si 3 districts dans la région → affiche 3
```

---

## Checklist finale

### Backend
- [ ] Route `/api/stats/agent` autorise "agent" et "district"
- [ ] `getAgentStats` détecte le rôle et applique le bon filtre
- [ ] `getRegionalStats` affiche par district (pas par centre)
- [ ] `getRegionalStats` compte uniquement les districts (type: "district") pour le KPI
- [ ] Logs backend corrects pour chaque rôle

### Frontend Agent/District
- [ ] Message adapté selon le rôle
- [ ] Agent voit ses propres données
- [ ] District voit l'agrégation

### Frontend Régional
- [ ] Titre "Performance par district"
- [ ] Colonne "District" dans le tableau
- [ ] KPI "Districts actifs"
- [ ] Message "par district" dans le sous-titre

### Cohérence des données
- [ ] Agent < District < Régional
- [ ] Somme des districts = Total régional
- [ ] Pas de fuite de données entre agents

---

## En cas de problème

### Agent voit trop de données
```bash
# Vérifier le filtre backend
# Doit être : { givenBy: userId, status: "done" }
# Logs : "👤 AGENT : Filtrage par givenBy"
```

### District ne voit pas les acteurs
```bash
# Vérifier la résolution des centres
# Logs : "🏛️ DISTRICT : Centres trouvés: X"
# Doit inclure tous les centres du district
```

### Régional affiche les centres au lieu des districts
```bash
# Vérifier la requête
# Doit chercher : { region: regionId, type: "district" }
# Pas : { region: regionId } (tous les centres)
```

---

**Si tous les tests passent** ✅ : Les rapports sont correctement configurés par rôle !
