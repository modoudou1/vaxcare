# 🧪 TESTS - Validation Rendez-vous Mobile

## 📋 Checklist de Validation

### **1. Vérifier que les rendez-vous s'affichent**

#### Backend - Vérifier les données
```bash
# 1. Voir les vaccinations d'un enfant
curl http://localhost:5000/api/mobile/children/CHILD_ID/appointments \
  -H "Authorization: Bearer YOUR_TOKEN"

# Résultat attendu:
[
  {
    "_id": "...",
    "vaccineName": "BCG",
    "date": "2025-11-15T10:00:00.000Z",
    "status": "scheduled",
    "location": "Centre de santé"
  },
  ...
]
```

#### Mobile - Vérifier les logs
```
Ouvrir le Dashboard mobile
Regarder les logs:

✅ Logs attendus:
📋 Rendez-vous à venir: 2
  → Prochain: Vaccin BCG le 2025-11-15T10:00:00.000Z
```

---

### **2. Tester le tri automatique**

#### Créer des rendez-vous avec différents statuts
```javascript
// Dans MongoDB ou via Postman

// 1. Vaccin programmé (doit être EN HAUT)
{
  "child": "CHILD_ID",
  "vaccine": "BCG_ID",
  "scheduledDate": "2025-11-15T10:00:00Z",
  "status": "scheduled"
}

// 2. Vaccin fait (doit être EN BAS avec VERT)
{
  "child": "CHILD_ID",
  "vaccine": "POLIO_ID",
  "doneDate": "2025-11-01T09:00:00Z",
  "status": "done"
}

// 3. Vaccin raté (doit être EN BAS avec ROUGE)
{
  "child": "CHILD_ID",
  "vaccine": "DTC_ID",
  "scheduledDate": "2025-10-25T11:00:00Z",
  "status": "missed"
}
```

#### Résultat attendu sur mobile
```
Écran Rendez-vous:

EN HAUT (Programmés):
┌────────────────────────┐
│ 15 NOV - Vaccin BCG    │
│ Programmé 🔵           │
└────────────────────────┘

EN BAS (Faits - VERT):
┌────────────────────────┐
│ 01 NOV - Vaccin Polio  │
│ Fait ✅ 🟢             │
└────────────────────────┘

EN BAS (Ratés - ROUGE):
┌────────────────────────┐
│ 25 OCT - Vaccin DTC    │
│ Raté 🔴                │
└────────────────────────┘
```

---

### **3. Tester le Dashboard**

#### Vérifier "Prochain rendez-vous"
```
Dashboard doit afficher:
- SEULEMENT le rendez-vous le plus proche
- Seulement les statuts: scheduled, planned, pending
- Pas les rendez-vous faits ou ratés

Exemple:
Si vous avez:
- BCG programmé le 15/11
- Penta programmé le 20/11
- Polio fait le 01/11

Dashboard affiche:
→ BCG le 15/11 (le plus proche)
```

---

### **4. Tester le changement de statut**

#### Test A : Marquer comme Fait
```bash
# 1. Ouvrir mobile Dashboard
# 2. Noter le "Prochain rendez-vous" (ex: BCG)

# 3. Sur web agent, marquer BCG comme fait
PUT http://localhost:5000/api/vaccinations/BCG_ID/complete

# 4. Sur mobile:
✅ Notification apparaît
✅ Dashboard recharge automatiquement
✅ BCG disparaît du "Prochain rendez-vous"
✅ Le suivant (Penta) apparaît

# 5. Ouvrir écran Rendez-vous:
✅ BCG est en BAS avec badge VERT "Fait ✅"
```

#### Test B : Marquer comme Raté
```bash
# 1. Sur web agent, marquer un vaccin comme raté
PUT http://localhost:5000/api/vaccinations/VACCINE_ID/missed

# 2. Sur mobile:
✅ Notification apparaît
✅ Dashboard recharge

# 3. Ouvrir écran Rendez-vous:
✅ Vaccin est en BAS avec badge ROUGE "Raté 🔴"
```

#### Test C : Programmer un nouveau vaccin
```bash
# 1. Sur web agent, programmer un nouveau vaccin
POST http://localhost:5000/api/vaccinations
{
  "child": "CHILD_ID",
  "vaccine": "VACCINE_ID",
  "scheduledDate": "2025-11-12T10:00:00Z", # Demain
  "status": "scheduled"
}

# 2. Sur mobile Dashboard:
✅ Notification apparaît
✅ Dashboard recharge
✅ Nouveau vaccin devient le "Prochain rendez-vous" (si c'est le plus proche)

# 3. Écran Rendez-vous:
✅ Nouveau vaccin apparaît EN HAUT avec badge BLEU
```

---

### **5. Tester les logs Backend**

```bash
# Démarrer le serveur et regarder les logs

npm run dev

# Quand mobile appelle l'API:
📋 X rendez-vous trouvés pour enfant ABC123:
  - 3 vaccinations
  - 1 appointments
  - Statuts: scheduled, scheduled, done, missed
```

---

### **6. Tester les logs Mobile**

```dart
// Ouvrir le Dashboard mobile
// Regarder les logs dans la console

// Logs attendus:
📅 Rendez-vous à venir: 2
  → Prochain: Vaccin BCG le 2025-11-15T10:00:00.000Z

🔄 Notification vaccination reçue - Rechargement des données...
📅 Rendez-vous à venir: 1
  → Prochain: Vaccin Penta le 2025-11-20T10:00:00.000Z
```

---

## ✅ Validation Complète

### Checklist finale

- [ ] **Backend API**
  - [ ] `/mobile/children/:id/appointments` retourne des données
  - [ ] Combine Vaccinations + Appointments
  - [ ] Tri côté serveur fonctionne
  - [ ] Logs détaillés visibles

- [ ] **Dashboard Mobile**
  - [ ] Affiche "Prochain rendez-vous"
  - [ ] Affiche SEULEMENT le plus proche
  - [ ] Recharge automatiquement sur notification
  - [ ] Logs de debugging visibles

- [ ] **Écran Rendez-vous Mobile**
  - [ ] Liste complète des rendez-vous
  - [ ] Programmés en HAUT avec badge BLEU
  - [ ] Faits en BAS avec badge VERT
  - [ ] Ratés en BAS avec badge ROUGE
  - [ ] Tri automatique fonctionne

- [ ] **Changements de Statut**
  - [ ] Marquer "Fait" → Badge vert en bas
  - [ ] Marquer "Raté" → Badge rouge en bas
  - [ ] Programmer nouveau → Badge bleu en haut
  - [ ] Dashboard se met à jour automatiquement

- [ ] **Performance**
  - [ ] Chargement rapide (<2s)
  - [ ] Pas d'erreurs de parsing
  - [ ] Pas de crash
  - [ ] Socket.io fonctionne en temps réel

---

## 🐛 Debugging

### Problème : Pas de rendez-vous visibles

```bash
# 1. Vérifier qu'il y a des vaccinations dans la base
mongo
> use vacxcare
> db.vaccinations.find({ child: ObjectId("CHILD_ID") })

# 2. Vérifier l'API
curl http://localhost:5000/api/mobile/children/CHILD_ID/appointments

# 3. Vérifier les logs backend
# Doit afficher: 📋 X rendez-vous trouvés...

# 4. Vérifier les logs mobile
# Doit afficher: 📅 Rendez-vous à venir: X
```

### Problème : Tri ne fonctionne pas

```bash
# 1. Vérifier que l'API retourne les statuts corrects
curl http://localhost:5000/api/mobile/children/CHILD_ID/appointments

# Chaque rendez-vous doit avoir:
{
  "status": "scheduled" | "done" | "missed" | "planned"
}

# 2. Vérifier le tri côté serveur
# Les logs doivent montrer: - Statuts: scheduled, scheduled, done, missed
# (programmés en premier)

# 3. Vérifier le mapping mobile
# Logs mobile doivent montrer les bons statuts après mapping
```

### Problème : Badge vert n'apparaît pas

```bash
# 1. Vérifier le statut dans l'API
curl http://localhost:5000/api/mobile/children/CHILD_ID/appointments
# Doit contenir: "status": "done"

# 2. Vérifier le mapping mobile
# Dans appointments_screen.dart:
# case 'done': return 'done';

# 3. Vérifier les couleurs
# _getStatusColor('done') doit retourner AppColors.success (vert)
```

---

## 📞 Support

Si les tests échouent, vérifier :

1. **Backend** : Port 5000 actif, MongoDB connecté
2. **Mobile** : URL correct (`http://localhost:5000`), Token valide
3. **Données** : Au moins une vaccination/appointment existe
4. **Socket.io** : Connexion établie, rooms correctes

**Logs à regarder** :
- Backend : `📋 X rendez-vous trouvés...`
- Mobile : `📅 Rendez-vous à venir: X`
- Notifications : `🔄 Notification vaccination reçue...`

🎉 **Si tous les tests passent, le système fonctionne parfaitement !**
