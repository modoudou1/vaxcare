# 🚨 GESTION DES VACCINS RATÉS

## 🎯 Objectif

Quand un vaccin est marqué comme raté (manuellement par l'agent ou automatiquement par le système) :
1. ✅ Marquer le statut comme "missed"
2. ✅ Envoyer notification Socket.io aux parents
3. ✅ Afficher dans une section dédiée "Vaccins Ratés"
4. ✅ Permettre reprogrammation facile
5. ✅ Message clair : "Contacter pour reprogrammer"

---

## ✅ FONCTIONNALITÉS IMPLÉMENTÉES

### **1. Backend - Marquer comme Raté**

#### Endpoint : `PUT /api/vaccinations/:id/missed`

**Fichier** : `/vacxcare-backend/src/controllers/vaccinationController.ts`

```typescript
export const markVaccinationMissed = async (req: Request, res: Response) => {
  // 1. Trouver la vaccination
  const vaccination = await Vaccination.findById(id)
    .populate("vaccine", "name")
    .populate("child", "name parentPhone");
  
  // 2. Mettre à jour le statut
  vaccination.status = "missed";
  await vaccination.save();
  
  // 3. Envoyer notification Socket.io
  const message = `⚠️ Le vaccin ${vaccineName} de ${childName} prévu le ${date} a été marqué comme raté par l'agent. Veuillez contacter le centre de santé pour le reprogrammer.`;
  
  sendSocketNotification(io, targetRooms, {
    title: `Vaccin ${vaccineName} raté`,
    message,
    icon: "⚠️",
    type: "vaccination",
    status: "warning"
  });
  
  // 4. Sauvegarder en base
  await Notification.create({
    title: `Vaccin ${vaccineName} raté`,
    message,
    targetRoles: ["parent"],
    metadata: { childId }
  });
};
```

**Notification envoyée aux rooms** :
- `child_{childId}`
- `parent_{phone}_child_{childId}`

---

### **2. Frontend - Section Vaccins Ratés**

#### Fichier : `/vacxcare-frontend/src/app/agent/enfants/ChildDetailsModal.tsx`

**Affichage automatique en haut** (section rouge visible) :

```tsx
{/* 🚨 SECTION VACCINS RATÉS - VISIBLE EN PERMANENCE */}
{vaccinations.filter((v) => v.status === "missed").length > 0 && (
  <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
    <div className="flex items-center gap-2 mb-3">
      <AlertTriangle className="h-5 w-5 text-red-600" />
      <h3 className="text-lg font-bold text-red-700">
        ⚠️ Vaccins Ratés - Contacter pour Reprogrammer
      </h3>
      <span className="bg-red-600 text-white rounded-full px-3 py-1 text-xs font-bold">
        {vaccinations.filter((v) => v.status === "missed").length}
      </span>
    </div>
    
    <p className="text-sm text-red-600 mb-3">
      Ces vaccins n'ont pas été administrés à la date prévue. 
      Veuillez contacter les parents pour les reprogrammer.
    </p>
    
    {/* Liste des vaccins ratés */}
  </div>
)}
```

**Chaque vaccin raté affiche** :
- ❌ Nom du vaccin
- 📅 Date prévue initiale
- ⏰ Nombre de jours depuis le raté
- 🔵 Bouton "Reprogrammer"
- 🟢 Bouton "Fait maintenant"

---

### **3. Actions Disponibles**

#### **A. Reprogrammer**

```tsx
<button onClick={() => {
  setSelectedVaccine(v.vaccine._id);
  setShowMissed(false);
  // Auto-scroll vers section programmation
  setTimeout(() => {
    document.getElementById('program-section')?.scrollIntoView({ 
      behavior: 'smooth' 
    });
  }, 100);
}}>
  <Clock className="h-4 w-4" />
  Reprogrammer
</button>
```

**Résultat** :
1. Pré-sélectionne le vaccin raté dans le formulaire
2. Scroll automatique vers la section "Programmer un vaccin"
3. Agent choisit nouvelle date/heure
4. Clic sur "Programmer"
5. Notification envoyée aux parents

---

#### **B. Marquer "Fait maintenant"**

```tsx
<button onClick={() => handleMarkMissedDone(v._id)}>
  <CheckCircle className="h-4 w-4" />
  Fait maintenant
</button>
```

**Action** : 
```typescript
async function handleMarkMissedDone(id: string) {
  // 1. Marquer comme "done"
  await fetch(`/api/vaccinations/${id}/complete`, {
    method: "PUT"
  });
  
  // 2. Mettre à jour enfant
  await fetch(`/api/children/${childId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "À jour"
    })
  });
  
  // 3. Notification "Vaccin administré"
}
```

---

## 🎨 Résultat Visuel

### **Modal Enfant - Section Vaccins Ratés**

```
┌─────────────────────────────────────────────────────┐
│  Détails de l'Enfant - Samba Diop                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ⚠️ VACCINS RATÉS - CONTACTER POUR REPROGRAMMER  2 │
│  ┌───────────────────────────────────────────────┐ │
│  │ Ces vaccins n'ont pas été administrés à la    │ │
│  │ date prévue. Veuillez contacter les parents.  │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ ❌ Vaccin BCG                                  │ │
│  │ 📅 Date prévue: lundi 4 novembre 2024         │ │
│  │ ⏰ Raté depuis: 3 jour(s)                      │ │
│  │                                                │ │
│  │        [🔵 Reprogrammer] [🟢 Fait maintenant] │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ ❌ Vaccin Polio                                │ │
│  │ 📅 Date prévue: jeudi 31 octobre 2024         │ │
│  │ ⏰ Raté depuis: 7 jour(s)                      │ │
│  │                                                │ │
│  │        [🔵 Reprogrammer] [🟢 Fait maintenant] │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Flux Complet

### **Scénario A : Agent marque un vaccin comme raté**

```
1. Agent : Ouvrir modal enfant
   ↓
2. Agent : Cliquer "❌ Raté" sur un vaccin programmé
   ↓
3. Backend : 
   - vaccination.status = "missed"
   - Envoyer notification Socket.io
   - Sauvegarder notification en base
   ↓
4. Parent (Mobile) :
   - Reçoit notification temps réel
   - "⚠️ Vaccin BCG raté - Contacter pour reprogrammer"
   ↓
5. Frontend (Agent) :
   - Section rouge "Vaccins Ratés" apparaît
   - Affiche le vaccin avec badge rouge
   - 2 boutons : Reprogrammer / Fait maintenant
   ↓
6. Agent : Cliquer "Reprogrammer"
   ↓
7. Frontend :
   - Pré-sélectionne le vaccin
   - Scroll vers formulaire programmation
   - Agent choisit nouvelle date
   - Clic "Programmer"
   ↓
8. Backend :
   - Crée nouvelle vaccination (status="scheduled")
   - Envoie notification "Vaccin reprogrammé"
   ↓
9. Parent (Mobile) :
   - Reçoit "📅 Vaccin BCG reprogrammé pour le 15 nov"
```

---

### **Scénario B : Parent arrive finalement**

```
1. Parent arrive au centre (vaccin raté affiché)
   ↓
2. Agent : Cliquer "🟢 Fait maintenant"
   ↓
3. Backend :
   - vaccination.status = "done"
   - vaccination.doneDate = maintenant
   - Envoie notification "Vaccin administré"
   ↓
4. Frontend :
   - Vaccin disparaît de section "Ratés"
   - Apparaît dans section "✅ Faits"
   - Badge vert
   ↓
5. Parent (Mobile) :
   - Reçoit "✅ Vaccin BCG administré aujourd'hui"
```

---

## 📱 Notification Mobile (Parent)

### **Format de la notification**

```dart
{
  'title': 'Vaccin BCG raté',
  'message': '⚠️ Le vaccin BCG de Samba Diop prévu le 4 novembre 2024 a été marqué comme raté par l'agent. Veuillez contacter le centre de santé pour le reprogrammer.',
  'icon': '⚠️',
  'type': 'vaccination',
  'status': 'warning',
  'date': '2024-11-07T09:30:00.000Z',
  'read': false
}
```

### **Affichage dans l'app mobile**

```
┌─────────────────────────────────┐
│  Notifications                  │
├─────────────────────────────────┤
│                                 │
│  ⚠️ Vaccin BCG raté             │
│  Le vaccin BCG de Samba Diop    │
│  prévu le 4 novembre a été      │
│  marqué comme raté.             │
│  Contactez le centre pour       │
│  reprogrammer.                  │
│                                 │
│  Il y a 2 minutes               │
└─────────────────────────────────┘
```

---

## 🧪 Tests de Validation

### **Test 1 : Marquer comme Raté**

```bash
1. Ouvrir modal enfant
2. Cliquer "❌ Raté" sur un vaccin programmé
3. Vérifier confirmation

✅ Résultat attendu :
- Alert "Vaccin marqué comme raté ❌"
- Section rouge "Vaccins Ratés" apparaît
- Vaccin affiché avec date et jours de retard
- 2 boutons disponibles
```

### **Test 2 : Reprogrammer**

```bash
1. Dans section "Vaccins Ratés"
2. Cliquer "Reprogrammer" sur un vaccin
3. Vérifier formulaire

✅ Résultat attendu :
- Scroll automatique vers formulaire
- Vaccin pré-sélectionné
- Champs date/heure vides (à remplir)
- Clic "Programmer" fonctionne
```

### **Test 3 : Fait maintenant**

```bash
1. Dans section "Vaccins Ratés"
2. Cliquer "Fait maintenant"
3. Vérifier mise à jour

✅ Résultat attendu :
- Alert "Vaccin validé ✅"
- Vaccin disparaît de section "Ratés"
- Apparaît dans "✅ Faits"
- Statut enfant mis à jour
```

### **Test 4 : Notification Mobile**

```bash
1. Marquer vaccin comme raté
2. Vérifier console backend

✅ Logs backend :
📡 Envoi notification vaccin marqué raté:
  - Vaccin: BCG
  - Enfant: Samba Diop (ID: ...)
  - Rooms cibles: ["child_...", "parent_..._child_..."]

3. Vérifier app mobile

✅ Mobile :
📩 NOTIFICATION REÇUE: { title: "Vaccin BCG raté", ... }
💾 Notification sauvegardée localement
```

---

## ✅ Résultat Final

### **Avantages**

- ✅ **Visibilité** : Section rouge impossible à manquer
- ✅ **Clarté** : Message "Contacter pour reprogrammer"
- ✅ **Rapidité** : Reprogrammation en 2 clics
- ✅ **Flexibilité** : "Fait maintenant" si parent arrive
- ✅ **Notifications** : Parents informés en temps réel
- ✅ **Suivi** : Compte de jours de retard
- ✅ **Badge** : Nombre de vaccins ratés visible

### **Workflow Optimisé**

```
Avant:
❌ Vaccin raté → Perdu dans la liste
❌ Agent doit chercher manuellement
❌ Pas de rappel visuel
❌ Parents pas informés

Après:
✅ Vaccin raté → Section rouge dédiée
✅ Reprogrammation en 2 clics
✅ Badge rouge avec nombre
✅ Parents notifiés instantanément
✅ Message clair : "Contacter pour reprogrammer"
```

---

## 🎉 Succès

**GESTION DES VACCINS RATÉS COMPLÈTE** !

- ✅ **Section dédiée visible** : Impossible à manquer
- ✅ **Reprogrammation facilitée** : Pré-sélection + scroll auto
- ✅ **Notifications parents** : Socket.io temps réel
- ✅ **Flexibilité** : Reprogrammer OU marquer fait
- ✅ **Suivi** : Jours de retard affichés
- ✅ **Message clair** : "Contacter pour reprogrammer"

🎊 **Les vaccins ratés sont maintenant gérés de manière professionnelle avec notifications et reprogrammation facile !**
