# 🔔 Guide des Notifications Socket.io - VacxCare

## ✅ Configuration Actuelle

### Backend (Port 5000)
Le backend est configuré pour envoyer des notifications en temps réel via Socket.io pour :

#### 1. **Campagnes** (`campaignController.ts`)
- Quand une campagne est créée
- Cible : `["parent", "agent", "regional"]`
- Type : `"campagne"`
- Icon : 📢

```typescript
sendSocketNotification(io, ["parent", "agent", "regional"], {
  title: `Nouvelle campagne : ${title}`,
  message: `📢 La campagne **${title}** débutera le ${readableDate}...`,
  type: "campagne",
  icon: "📢",
  status: "info",
});
```

#### 2. **Vaccinations** (`vaccinationController.ts`)
- Quand un vaccin est administré
- Quand un vaccin est programmé
- Quand un vaccin est complété
- Cible : rooms spécifiques au parent et à l'enfant

```typescript
sendSocketNotification(io, targetRooms, {
  title: `Vaccin ${vaccineName} administré`,
  message: `💉 Le vaccin ${vaccineName} a été administré à ${childName}...`,
  icon: "💉",
  type: "vaccination",
});
```

#### 3. **Notifications Générales** (`notificationController.ts`)
- Notifications système créées par admin/national
- Cible : rôles configurables (`targetRoles`)

```typescript
sendSocketNotification(io, notif.targetRoles, {
  title: notif.title,
  message: notif.message,
  type: notif.type,
  icon: notif.icon,
  status: notif.status,
});
```

### Mobile (Flutter)

#### Écrans avec Socket.io configuré ✅

1. **`ModernDashboardScreen`** ✅ (Nouveau - ajouté aujourd'hui)
   - Se connecte au Socket.io au démarrage
   - Écoute `newNotification`
   - Affiche une SnackBar avec action "Voir"
   - Incrémente le compteur de notifications

2. **`DashboardScreen`** ✅
   - Connexion Socket.io complète
   - Gestion des notifications en temps réel
   - Stockage local des notifications

3. **`NotificationsScreen`** ✅
   - Connexion Socket.io dédiée
   - Affichage en temps réel des nouvelles notifications

## 🔌 Flux de Connexion Socket.io

### 1. Connexion initiale
```dart
socket = IO.io(
  'http://localhost:5000',
  IO.OptionBuilder()
      .setTransports(['websocket'])
      .setReconnectionAttempts(10)
      .setReconnectionDelay(2000)
      .disableAutoConnect()
      .build(),
);
socket!.connect();
```

### 2. Enregistrement de l'utilisateur
```dart
socket!.emit("registerUser", {
  "userId": parentUserId,
  "role": "parent",
  "rooms": [
    "parent",
    "all",
    "parent_${parentPhone}_child_${childId}"
  ],
  "parentPhone": parentPhone,
  "childId": childId,
});
```

### 3. Écoute des notifications
```dart
socket!.on("newNotification", (data) {
  if (data is Map && data["title"] != null) {
    // Incrémenter le compteur
    setState(() {
      _notificationCount++;
    });
    
    // Afficher une SnackBar
    ScaffoldMessenger.of(context).showSnackBar(...);
  }
});
```

## 📡 Rooms Socket.io

Le système utilise des "rooms" pour cibler les notifications :

### Rooms globales
- `"all"` - Tous les utilisateurs
- `"parent"` - Tous les parents
- `"agent"` - Tous les agents
- `"regional"` - Tous les régionaux
- `"national"` - Niveau national

### Rooms spécifiques
- `"child_${childId}"` - Notifications pour un enfant spécifique
- `"parent_${parentPhone}_child_${childId}"` - Notifications privées parent+enfant

## 🧪 Test des Notifications

### 1. Test via l'API
```bash
# Créer une notification de test
curl -X GET http://localhost:5000/api/notifications/test/socket
```

### 2. Test via une campagne
```bash
# Créer une campagne (nécessite authentification)
POST http://localhost:5000/api/campaigns
{
  "title": "Campagne Test",
  "description": "Test de notification",
  "startDate": "2025-11-10",
  "endDate": "2025-11-20"
}
```

### 3. Vérifier dans les logs backend
```
📡 Notification envoyée → parent
📡 Notification envoyée → agent
📡 Notification envoyée → regional
```

### 4. Vérifier dans les logs mobile (Flutter DevTools)
```
🔌 ModernDashboard Socket → http://localhost:5000 | child=xxx | phone=xxx
✅ ModernDashboard Socket connecté
📤 registerUser envoyé avec rooms: [parent, all, parent_xxx_child_xxx]
✅ ModernDashboard Rooms rejointes: [parent, all, parent_xxx_child_xxx]
📩 ModernDashboard: newNotification {title: ..., message: ...}
```

## 🐛 Dépannage

### Le mobile ne reçoit pas les notifications

1. **Vérifier que le backend tourne sur le bon port**
   ```bash
   # Dans les logs backend, vous devez voir :
   🚀 Serveur démarré sur le port 5000
   ```

2. **Vérifier la connexion Socket.io**
   ```dart
   // Dans les logs Flutter, vous devez voir :
   ✅ ModernDashboard Socket connecté
   ✅ ModernDashboard Rooms rejointes: [...]
   ```

3. **Vérifier que le mobile utilise le bon port**
   - Tous les fichiers ont été mis à jour pour utiliser `5000` au lieu de `5001`
   - Si vous testez sur un appareil physique, remplacez `localhost` par l'IP de votre machine

4. **Vérifier les rooms**
   - Le backend doit envoyer vers les bonnes rooms
   - Le mobile doit s'enregistrer dans les bonnes rooms
   - Les logs backend montrent : `📡 Notification envoyée → parent`
   - Les logs mobile montrent : `✅ Rooms rejointes: [parent, all, ...]`

### Erreur de connexion

Si vous voyez `ERR_CONNECTION_REFUSED` :
- Le backend n'est pas démarré
- Le port est incorrect
- Sur mobile physique, utilisez l'IP LAN au lieu de `localhost`

### Les notifications n'apparaissent pas

1. Vérifier que `_notificationCount` s'incrémente
2. Vérifier que la SnackBar s'affiche
3. Vérifier les logs : `📩 ModernDashboard: newNotification ...`

## 📝 Persistance des Notifications

Les notifications sont également sauvegardées en base de données MongoDB :

```typescript
const notif = await Notification.create({
  title,
  message,
  type: "campagne",
  targetRoles: ["parent", "agent", "regional"],
  icon: "📢",
  status: "info",
});
```

Cela permet :
- De récupérer l'historique via `GET /api/notifications`
- De marquer comme lu via `PUT /api/notifications/:id/read`
- De masquer via `POST /api/notifications/:id/hide`

## 🎯 Prochaines Étapes

Pour améliorer le système :

1. **Notifications push natives** (Firebase Cloud Messaging)
2. **Badge de notifications** sur l'icône de l'app
3. **Sons et vibrations** pour les notifications importantes
4. **Filtrage par type** de notification
5. **Notifications programmées** (rappels de vaccins)

## 🔗 Fichiers Clés

### Backend
- `src/utils/socketManager.ts` - Gestion Socket.io
- `src/controllers/notificationController.ts` - API notifications
- `src/controllers/campaignController.ts` - Notifications campagnes
- `src/controllers/vaccinationController.ts` - Notifications vaccins
- `src/server.ts` - Configuration Socket.io

### Mobile
- `lib/screens/dashboard/modern_dashboard_screen.dart` - Dashboard moderne avec Socket.io
- `lib/screens/dashboard/dashboard_screen.dart` - Dashboard classique avec Socket.io
- `lib/screens/dashboard/notifications_screen.dart` - Écran notifications avec Socket.io
- `lib/services/api_service.dart` - Configuration API (port 5000)

---

**Date de mise à jour** : 6 novembre 2025
**Version** : 1.0
**Statut** : ✅ Fonctionnel
