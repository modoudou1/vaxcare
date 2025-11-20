# 🔄 Étapes de Reconnexion Mobile

## ⚠️ IMPORTANT
Vous devez vous **reconnecter** pour obtenir le nouveau token JWT qui vient d'être ajouté au backend !

## 📱 Méthode 1 : Forcer la déconnexion dans le code

### Option A : Utiliser Flutter DevTools Console
1. Ouvrez Flutter DevTools
2. Dans la console, exécutez :
```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
const storage = FlutterSecureStorage();
await storage.deleteAll();
```

### Option B : Ajouter un bouton de déconnexion temporaire
Ajoutez ce code temporaire dans `ModernDashboardScreen` ou `LoginScreen` :

```dart
// Bouton temporaire pour effacer le storage
FloatingActionButton(
  onPressed: () async {
    const storage = FlutterSecureStorage();
    await storage.deleteAll();
    print('✅ Storage effacé - Redémarrez l\'app');
  },
  child: Icon(Icons.logout),
)
```

## 📱 Méthode 2 : Effacer les données de l'app (Recommandé)

### Sur navigateur web (Chrome/Edge)
1. Ouvrez DevTools (F12)
2. Onglet **Application** > **Storage**
3. Cliquez sur **Clear site data**
4. Rechargez la page

### Sur iOS Simulator
```bash
# Réinitialisez le simulateur
xcrun simctl erase all
```

### Sur Android Emulator
```bash
# Dans les paramètres de l'app
Paramètres > Apps > VacxCare > Stockage > Effacer les données
```

## 🔍 Vérification après reconnexion

Après vous être reconnecté, vérifiez dans les logs Flutter :

### ✅ Logs attendus :
```
✅ Token JWT sauvegardé: eyJhbGciOiJIUzI1NiIs...
🔑 Token récupéré du storage: eyJhbGciOiJIUzI1NiIs...
📡 Appel API: http://localhost:5000/api/notifications
📤 Headers envoyés: [Content-Type, Authorization]
📥 Status Code: 200
✅ X notifications reçues
```

### ❌ Si vous voyez toujours :
```
🔑 Token récupéré du storage: NULL
📥 Status Code: 401
❌ 401 Unauthorized - Token invalide ou manquant
```
→ Le token n'a pas été sauvegardé, vous devez vous reconnecter !

## 🧪 Test Backend

Pour vérifier que le backend génère bien le token :

### Avec curl :
```bash
curl -X POST http://localhost:5000/api/mobile/parent-link-auth \
  -H "Content-Type: application/json" \
  -d '{
    "childId": "VOTRE_CHILD_ID",
    "parentPhone": "779990000"
  }'
```

### Réponse attendue :
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "child": {
    "id": "...",
    "name": "...",
    ...
  }
}
```

## 🔧 Dépannage

### Le token est NULL
→ Vous ne vous êtes pas reconnecté après les modifications du backend

### Le token existe mais 401
→ Le token est invalide, vérifiez :
- Que le backend utilise le même `JWT_SECRET`
- Que le middleware `authMiddleware` accepte le role "user"
- Les logs backend : `✅ Token JWT généré pour parent`

### Les notifications sont vides
→ Normal si aucune campagne n'a été créée et aucun vaccin administré

### Le compteur affiche 2 (mock data)
→ L'API retourne une erreur, donc les données mock sont utilisées
→ Reconnectez-vous pour obtenir les vraies données !

## 📋 Checklist

- [ ] Backend redémarré avec les nouvelles modifications
- [ ] Storage mobile effacé (deleteAll)
- [ ] Reconnecté avec ID enfant + téléphone parent
- [ ] Log "✅ Token JWT sauvegardé" visible
- [ ] Log "📥 Status Code: 200" lors de l'appel notifications
- [ ] Les vraies notifications s'affichent (pas mock)

---

**Une fois reconnecté, le compteur devrait afficher le vrai nombre de notifications et vous devriez pouvoir les voir en cliquant !**
