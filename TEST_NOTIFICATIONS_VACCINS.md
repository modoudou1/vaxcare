# 🧪 Test des Notifications de Vaccins

## 📋 Préparation

### 1. Redémarrer le backend
```bash
cd /Users/macretina/Vacxcare/vacxcare-backend
npm run dev
```

### 2. Hot restart le mobile
Dans le terminal Flutter : `r`

### 3. Vérifier que Socket.io est connecté
**Logs mobile attendus :**
```
✅ ModernDashboard Socket connecté
✅ ModernDashboard Rooms rejointes: [parent, all, child_690c5abd..., parent_221779990000_child_690c5abd...]
```

## 🔍 Test 1 : Programmer un Vaccin

### Action
1. Ouvrez le dashboard web → `http://localhost:3000`
2. Connectez-vous avec un compte **Agent**
3. Allez dans **Vaccinations** → **Programmer un vaccin**
4. Remplissez :
   - Enfant : Sélectionnez l'enfant du mobile connecté
   - Vaccin : BCG (ou autre)
   - Date : Demain
5. Cliquez sur **Enregistrer**

### Logs Backend Attendus
```
📡 Envoi notification vaccin programmé:
  - Vaccin: BCG
  - Enfant: Mohamed (ID: 690c5abd9a63065044d7b6de)
  - Date prévue: 07/11/2025
  - Rooms cibles: [ 'child_690c5abd9a63065044d7b6de', 'parent_221779990000_child_690c5abd9a63065044d7b6de' ]
  - Parents IDs: [ '...' ]

🔵 === ENVOI SOCKET.IO ===
  📦 Payload: {
    "userId": "690c5abd9a63065044d7b6de",
    "title": "Vaccin BCG programmé",
    "message": "📅 Le vaccin BCG de Mohamed est prévu pour le 07/11/2025.",
    "icon": "📅",
    "type": "vaccination",
    "createdAt": "..."
  }
  🎯 Rooms cibles: [ 'child_690c5abd9a63065044d7b6de', 'parent_221779990000_child_690c5abd9a63065044d7b6de' ]
  👥 Utilisateurs connectés: 1
  ✅ Utilisateurs qui vont recevoir: [
    {
      socketId: 'xyz123',
      role: 'parent',
      rooms: [ 'child_690c5abd9a63065044d7b6de', 'parent_221779990000_child_690c5abd9a63065044d7b6de' ]
    }
  ]
📡 Notification envoyée → child_690c5abd9a63065044d7b6de
📡 Notification envoyée → parent_221779990000_child_690c5abd9a63065044d7b6de
🔵 === FIN ENVOI ===
✅ Notification sauvegardée en base pour 1 parent(s)
```

### Logs Mobile Attendus
```
📩 ModernDashboard: newNotification {title: Vaccin BCG programmé, message: 📅 Le vaccin BCG de Mohamed...}
```

### Résultat Mobile
✅ **SnackBar apparaît** : "📅 Vaccin BCG programmé"

---

## 🔍 Test 2 : Administrer un Vaccin

### Action
1. Dashboard web → **Vaccinations** → **Enregistrer une vaccination**
2. Remplissez :
   - Enfant : L'enfant du mobile
   - Vaccin : Polio
   - Date : Aujourd'hui
3. Cliquez sur **Enregistrer**

### Logs Backend Attendus
```
📡 Envoi notification vaccin administré:
  - Vaccin: Polio
  - Enfant: Mohamed (ID: 690c5abd9a63065044d7b6de)
  - Rooms cibles: [ 'child_690c5abd9a63065044d7b6de', 'parent_221779990000_child_690c5abd9a63065044d7b6de' ]
  - Parents IDs: [ '...' ]

🔵 === ENVOI SOCKET.IO ===
  📦 Payload: {
    "userId": "690c5abd9a63065044d7b6de",
    "title": "Vaccin Polio administré",
    "message": "💉 Le vaccin Polio a été administré à Mohamed le 06/11/2025.",
    "icon": "💉",
    "type": "vaccination",
    "createdAt": "..."
  }
  🎯 Rooms cibles: [ 'child_690c5abd9a63065044d7b6de', ... ]
  👥 Utilisateurs connectés: 1
  ✅ Utilisateurs qui vont recevoir: [ { socketId: '...', role: 'parent', rooms: [...] } ]
📡 Notification envoyée → child_690c5abd9a63065044d7b6de
📡 Notification envoyée → parent_221779990000_child_690c5abd9a63065044d7b6de
🔵 === FIN ENVOI ===
✅ Notification sauvegardée en base pour 1 parent(s)
```

### Résultat Mobile
✅ **SnackBar apparaît** : "💉 Vaccin Polio administré"

---

## 🔍 Test 3 : Compléter un Vaccin Programmé

### Action
1. Dashboard web → **Vaccinations**
2. Trouvez un vaccin avec statut **"scheduled"** (programmé)
3. Cliquez sur l'icône ✅ pour le marquer comme fait

### Logs Backend Attendus
```
📡 Envoi notification vaccin complété:
  - Vaccin: BCG
  - Enfant: Mohamed (ID: 690c5abd9a63065044d7b6de)
  - Rooms cibles: [ 'child_690c5abd9a63065044d7b6de', ... ]
  - Parents IDs: [ '...' ]

🔵 === ENVOI SOCKET.IO ===
  📦 Payload: {
    "title": "Vaccin BCG complété",
    "message": "✅ Le vaccin BCG de Mohamed a été confirmé comme administré le 06/11/2025.",
    "icon": "💉",
    "type": "vaccination",
    "createdAt": "..."
  }
  🎯 Rooms cibles: [ 'child_690c5abd9a63065044d7b6de', ... ]
  👥 Utilisateurs connectés: 1
  ✅ Utilisateurs qui vont recevoir: [ { socketId: '...', role: 'parent', rooms: [...] } ]
📡 Notification envoyée → child_690c5abd9a63065044d7b6de
🔵 === FIN ENVOI ===
✅ Notification sauvegardée en base pour 1 parent(s)
```

### Résultat Mobile
✅ **SnackBar apparaît** : "💉 Vaccin BCG complété"

---

## ❌ Problèmes Possibles

### 1. Aucun utilisateur ne reçoit
**Logs backend :**
```
👥 Utilisateurs connectés: 0
✅ Utilisateurs qui vont recevoir: []
```
**Solution :** Le mobile n'est pas connecté. Vérifiez les logs mobile.

### 2. Rooms ne correspondent pas
**Logs backend :**
```
Rooms cibles: [ 'child_ABC', 'parent_123_child_ABC' ]
Utilisateurs qui vont recevoir: []
```
**Logs mobile :**
```
Rooms rejointes: [parent, all, child_XYZ]
```
**Solution :** L'ID enfant ne correspond pas. Vérifiez :
```bash
# Logs backend
- Enfant: Mohamed (ID: 690c5abd9a63065044d7b6de)

# Logs mobile
Rooms rejointes: [parent, all, child_690c5abd9a63065044d7b6de, ...]
```

### 3. Socket.io déconnecté
**Logs mobile :**
```
🔴 Socket déconnecté: io client disconnect
```
**Solution :** Hot restart le mobile (`r`)

### 4. Aucun parent trouvé
**Logs backend :**
```
⚠️ Aucun parent trouvé pour envoyer la notification
```
**Solution :** Le champ `parentPhone` de l'enfant est vide ou incorrect. Vérifiez dans MongoDB.

---

## ✅ Checklist Finale

- [ ] Backend redémarré et logs activés
- [ ] Mobile hot restart
- [ ] Socket.io connecté (logs mobile ✅)
- [ ] Rooms correctes rejointes (logs mobile)
- [ ] Programmation vaccin → SnackBar 📅
- [ ] Administration vaccin → SnackBar 💉
- [ ] Complétion vaccin → SnackBar 💉
- [ ] Logs backend montrent envoi Socket.io
- [ ] Logs backend montrent utilisateur qui reçoit

---

## 📞 Debug Rapide

### Vérifier l'ID enfant dans le mobile
Dans les logs mobile :
```
🔌 ModernDashboard Socket → http://localhost:5000 | child=690c5abd9a63065044d7b6de | phone=221779990000
```

### Vérifier le parentPhone dans MongoDB
```js
db.children.findOne({ _id: ObjectId("690c5abd9a63065044d7b6de") })
// Doit contenir : parentPhone: "221779990000" ou similaire
```

### Test rapide Socket.io
```bash
curl http://localhost:5000/api/notifications/test/socket
```
Le mobile devrait recevoir une notification de test.
