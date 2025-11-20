# 📊 Nouvelle logique du Taux de Complétion Vaccinal

## 🎯 Objectif

Le taux de complétion vaccinal est maintenant calculé **sur la base du calendrier vaccinal national** (`VaccineCalendar`), et non plus simplement sur le ratio vaccinations faites / vaccinations enregistrées.

**Limite maximale : 100%**

---

## 🧮 Formule de calcul

### Pour un enfant individuel

```
Taux = (Nombre de vaccinations FAITES / Nombre de doses ATTENDUES selon l'âge) × 100
```

**Doses attendues** = Toutes les entrées du `VaccineCalendar` pour lesquelles l'enfant a atteint l'âge requis.

**Vaccinations faites** = Vaccinations avec `status = "done"` pour cet enfant.

### Pour un agent (centre de santé)

```
Taux global = (Σ vaccinations faites de tous les enfants / Σ doses attendues de tous les enfants) × 100
```

C'est un **taux pondéré** qui prend en compte tous les enfants du centre.

---

## 📅 Calendrier Vaccinal (VaccineCalendar)

### Structure

```typescript
{
  vaccine: string[];           // Ex: ["BCG", "HepB", "VPO"]
  dose: string;                // Ex: "1ère dose", "2ème dose", "Rappel"
  ageUnit: "weeks" | "months" | "years";
  specificAge?: number;        // Ex: 0 (naissance)
  minAge?: number;             // Ex: 6 (mois)
  maxAge?: number;             // Ex: 14 (mois)
  description?: string;
}
```

### Exemple du calendrier national (image fournie)

| Âge | Vaccins |
|-----|---------|
| Naissance | BCG + HepB 0 + VPO 0 |
| 6 semaines | Penta 1 + Pneumo1 + VPO 1 + Rota1 |
| 10 semaines | Penta 2 + Pneumo 2 + VPO 2 + Rota2 |
| 14 semaines | Penta 3 + Pneumo 3 + VPO 3 + **Rota 3** + VPI |
| 9 mois | RR 1 + VAA |
| 15 mois | RR 2 |
| Fille 9-14 ans | HPV (2 doses espacées de 6 mois) |

---

## 🔧 Implémentation Backend

### Nouvelle fonction helper

**Fichier** : `/vacxcare-backend/src/utils/completionRate.ts`

#### Pour un enfant

```typescript
import { calculateChildCompletionRate } from "../utils/completionRate";

const result = await calculateChildCompletionRate(childId);
// Retourne:
{
  completionRate: 75,           // Pourcentage
  expectedDoses: 12,            // Doses attendues selon l'âge
  completedDoses: 9,            // Doses faites
  missingDoses: [               // Doses manquantes
    { vaccines: ["Penta 3"], dose: "3ème dose" },
    { vaccines: ["Pneumo 3"], dose: "3ème dose" },
    { vaccines: ["VPO 3"], dose: "3ème dose" }
  ],
  child: {
    id: "...",
    name: "Ahmed Diallo",
    age: 15                     // âge en mois
  }
}
```

#### Pour un agent

```typescript
import { calculateAgentCompletionRate } from "../utils/completionRate";

const result = await calculateAgentCompletionRate(healthCenter);
// Retourne:
{
  completionRate: 82,           // Taux global pondéré
  totalChildren: 45,            // Nombre d'enfants du centre
  totalExpectedDoses: 540,      // Total doses attendues (tous enfants)
  totalCompletedDoses: 443      // Total doses faites (tous enfants)
}
```

---

## 🌐 API Endpoints

### 1. Dashboard Agent

**Route** : `GET /api/dashboard/agent/stats`

**Authentification** : Agent uniquement

**Réponse modifiée** :
```json
{
  "totalChildren": 45,
  "vaccinatedChildren": 38,
  "pendingVaccinations": 12,
  "overdueVaccinations": 3,
  "upcomingAppointments": 8,
  "completionRate": 82,        // ← Maintenant basé sur le calendrier
  "recentActivity": [...]
}
```

### 2. Taux de complétion d'un enfant

**Route** : `GET /api/children/:id/completion-rate`

**Authentification** : Agent, Regional, National, User (parent)

**Exemple** :
```bash
GET /api/children/6734abc123/completion-rate
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "completionRate": 75,
    "expectedDoses": 12,
    "completedDoses": 9,
    "missingDoses": [
      {
        "vaccines": ["Penta 3", "Pneumo 3"],
        "dose": "3ème dose"
      }
    ],
    "child": {
      "id": "6734abc123",
      "name": "Ahmed Diallo",
      "age": 15
    }
  }
}
```

---

## 🎨 Intégration Frontend

### Dashboard Agent

**Fichier** : `/vacxcare-frontend/src/app/agent/dashboard/page.tsx`

Le dashboard agent utilise maintenant automatiquement le nouveau calcul via l'API `/api/dashboard/agent/stats`.

**Affichage** :
```tsx
<div className="bg-gradient-to-br from-indigo-500 to-purple-600">
  <div className="text-5xl font-bold text-white">
    {stats.completionRate}%
  </div>
  <p className="text-white/90">Taux de complétion</p>
</div>
```

### Détail Enfant

**Fichier** : À créer ou modifier dans `/vacxcare-frontend/src/app/agent/enfants/[id]/page.tsx`

```typescript
const [completionData, setCompletionData] = useState(null);

useEffect(() => {
  const fetchCompletion = async () => {
    const response = await fetch(
      `${API_BASE_URL}/api/children/${childId}/completion-rate`,
      { credentials: "include" }
    );
    const data = await response.json();
    setCompletionData(data.data);
  };
  fetchCompletion();
}, [childId]);
```

**Affichage** :
```tsx
{completionData && (
  <div className="bg-white rounded-xl p-6 shadow-sm">
    <h3 className="text-lg font-semibold mb-4">Progression Vaccinale</h3>
    
    {/* Barre de progression */}
    <div className="relative w-full h-6 bg-gray-200 rounded-full overflow-hidden">
      <div 
        className="absolute h-full bg-gradient-to-r from-green-400 to-green-600"
        style={{ width: `${completionData.completionRate}%` }}
      />
    </div>
    
    <div className="flex justify-between mt-2 text-sm">
      <span>
        {completionData.completedDoses} / {completionData.expectedDoses} doses
      </span>
      <span className="font-bold text-green-600">
        {completionData.completionRate}%
      </span>
    </div>

    {/* Doses manquantes */}
    {completionData.missingDoses.length > 0 && (
      <div className="mt-4">
        <p className="font-semibold text-orange-600 mb-2">
          Vaccins en retard :
        </p>
        <ul className="space-y-1">
          {completionData.missingDoses.map((missing, idx) => (
            <li key={idx} className="text-sm text-gray-700">
              • {missing.vaccines.join(", ")} - {missing.dose}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
)}
```

---

## 📱 Intégration Mobile (Flutter)

### Modèle de données

**Fichier** : `lib/models/completion_rate.dart`

```dart
class CompletionRate {
  final int completionRate;
  final int expectedDoses;
  final int completedDoses;
  final List<MissingDose> missingDoses;
  final ChildInfo child;

  CompletionRate({
    required this.completionRate,
    required this.expectedDoses,
    required this.completedDoses,
    required this.missingDoses,
    required this.child,
  });

  factory CompletionRate.fromJson(Map<String, dynamic> json) {
    return CompletionRate(
      completionRate: json['completionRate'],
      expectedDoses: json['expectedDoses'],
      completedDoses: json['completedDoses'],
      missingDoses: (json['missingDoses'] as List)
          .map((e) => MissingDose.fromJson(e))
          .toList(),
      child: ChildInfo.fromJson(json['child']),
    );
  }
}

class MissingDose {
  final List<String> vaccines;
  final String dose;

  MissingDose({required this.vaccines, required this.dose});

  factory MissingDose.fromJson(Map<String, dynamic> json) {
    return MissingDose(
      vaccines: List<String>.from(json['vaccines']),
      dose: json['dose'],
    );
  }
}
```

### Appel API

**Fichier** : `lib/services/child_service.dart`

```dart
Future<CompletionRate> getChildCompletionRate(String childId) async {
  final storage = FlutterSecureStorage();
  final token = await storage.read(key: 'auth_token');

  final response = await http.get(
    Uri.parse('$baseUrl/api/children/$childId/completion-rate'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    return CompletionRate.fromJson(data['data']);
  } else {
    throw Exception('Erreur chargement taux complétion');
  }
}
```

### Widget d'affichage

**Fichier** : `lib/widgets/completion_rate_widget.dart`

```dart
class CompletionRateWidget extends StatelessWidget {
  final CompletionRate completionRate;

  const CompletionRateWidget({required this.completionRate});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Progression Vaccinale',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            
            // Barre de progression
            LinearProgressIndicator(
              value: completionRate.completionRate / 100,
              backgroundColor: Colors.grey[300],
              valueColor: AlwaysStoppedAnimation<Color>(
                _getProgressColor(completionRate.completionRate),
              ),
              minHeight: 12,
            ),
            
            SizedBox(height: 8),
            
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${completionRate.completedDoses} / ${completionRate.expectedDoses} doses',
                  style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                ),
                Text(
                  '${completionRate.completionRate}%',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: _getProgressColor(completionRate.completionRate),
                  ),
                ),
              ],
            ),
            
            // Vaccins manquants
            if (completionRate.missingDoses.isNotEmpty) ...[
              SizedBox(height: 16),
              Text(
                'Vaccins en retard :',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.orange[700],
                ),
              ),
              SizedBox(height: 8),
              ...completionRate.missingDoses.map((missing) => Padding(
                padding: EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber, size: 16, color: Colors.orange),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${missing.vaccines.join(", ")} - ${missing.dose}',
                        style: TextStyle(fontSize: 13),
                      ),
                    ),
                  ],
                ),
              )).toList(),
            ],
          ],
        ),
      ),
    );
  }

  Color _getProgressColor(int rate) {
    if (rate >= 80) return Colors.green;
    if (rate >= 50) return Colors.orange;
    return Colors.red;
  }
}
```

---

## 📈 Exemples de calcul

### Exemple 1 : Bébé de 3 mois

**Calendrier applicable** (doses attendues) :
- Naissance : BCG + HepB 0 + VPO 0 = 3 doses
- 6 semaines : Penta 1 + Pneumo 1 + VPO 1 + Rota 1 = 4 doses
- 10 semaines : Penta 2 + Pneumo 2 + VPO 2 + Rota 2 = 4 doses

**Total attendu** : 11 doses

**Vaccinations faites** : 9 doses (manque Penta 2, Rota 2)

**Taux** : (9 / 11) × 100 = **82%**

---

### Exemple 2 : Enfant de 2 ans

**Calendrier applicable** : Toutes les doses jusqu'à 15 mois

**Total attendu** : 18 doses

**Vaccinations faites** : 18 doses

**Taux** : (18 / 18) × 100 = **100%** ✅

---

### Exemple 3 : Agent avec 10 enfants

**Enfant 1** : 8/10 doses  
**Enfant 2** : 12/12 doses  
**Enfant 3** : 5/8 doses  
...  
**Total** : 82 doses faites / 100 doses attendues

**Taux global** : (82 / 100) × 100 = **82%**

---

## ✅ Avantages de cette approche

1. **Précision** : Le taux reflète la vraie conformité au calendrier national
2. **Comparabilité** : Tous les enfants sont mesurés selon le même référentiel
3. **Limite 100%** : Impossible de dépasser 100% (cohérent avec un calendrier fixe)
4. **Détection des retards** : Identification claire des doses manquantes
5. **Pondération correcte** : Le taux agent agrège correctement tous les enfants

---

## 🚨 Points d'attention

1. **Le calendrier doit être rempli** : Assurez-vous que `VaccineCalendar` contient toutes les entrées du calendrier national.

2. **Correspondance vaccin-nom** : La fonction cherche une correspondance entre le nom du vaccin dans `Vaccination.vaccine.name` et `VaccineCalendar.vaccine[]`. Utilisez des noms cohérents.

3. **Performance** : Pour un agent avec beaucoup d'enfants, le calcul peut prendre du temps. Envisagez une mise en cache si nécessaire.

4. **Date de naissance** : Obligatoire pour calculer l'âge et déterminer les doses attendues.

---

## 🔄 Migration

Si vous aviez déjà des taux de complétion affichés avec l'ancienne méthode, ils seront automatiquement remplacés par les nouveaux calculs dès le prochain chargement.

Aucune modification de base de données n'est nécessaire.

---

## 📞 Support

Pour toute question sur l'implémentation, consultez :
- Le code source : `/vacxcare-backend/src/utils/completionRate.ts`
- Les tests : À créer si nécessaire
- L'équipe technique

---

**Date de mise à jour** : 8 Novembre 2024  
**Version** : 2.0
