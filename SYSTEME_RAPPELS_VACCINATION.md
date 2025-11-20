# 🔔 Système de Rappels Automatiques de Vaccination

## 📌 Vue d'ensemble

Le système envoie automatiquement des rappels quotidiens aux parents pour les vaccinations programmées dans les **5 prochains jours**.

### Fonctionnalités clés
- ✅ Rappels quotidiens automatiques (CRON job à 9h00)
- ✅ Support WhatsApp (prioritaire) + SMS (fallback)
- ✅ Notifications Socket.io en temps réel
- ✅ Sauvegarde en base de données
- ✅ Anti-doublon (un seul rappel par jour par vaccination)
- ✅ Messages personnalisés selon le nombre de jours restants

---

## 🏗️ Architecture

### Fichiers créés/modifiés

#### 1. Service de rappels
**`/vacxcare-backend/src/services/vaccinationReminder.ts`**
- Fonction principale : `sendVaccinationReminders()`
- Récupère les vaccinations programmées dans les 5 prochains jours
- Vérifie si un rappel a déjà été envoyé aujourd'hui
- Envoie via 3 canaux : Base de données, Socket.io, WhatsApp/SMS

#### 2. CRON job
**`/vacxcare-backend/src/cron/vaccinationRemindersCron.ts`**
- Planification : Tous les jours à 9h00 (`0 9 * * *`)
- Appelle `sendVaccinationReminders()` automatiquement

#### 3. Configuration serveur
**`/vacxcare-backend/src/server.ts`**
- Import et démarrage du CRON job au lancement du serveur

#### 4. Route de test
**`/vacxcare-backend/src/routes/test.ts`**
- Endpoint : `GET /api/test/vaccination-reminders`
- Permet de tester le système sans attendre 9h00

#### 5. Dépendances
**`/vacxcare-backend/package.json`**
- `node-cron` : Gestion des tâches planifiées
- `@types/node-cron` : Types TypeScript

---

## 🔄 Flux de Fonctionnement

### 1. Déclenchement automatique (9h00 chaque jour)
```
CRON Job → sendVaccinationReminders()
```

### 2. Récupération des données
```sql
Vaccinations.find({
  status: "scheduled",
  scheduledDate: { $gte: aujourd'hui, $lte: aujourd'hui + 5 jours }
})
.populate("child", "name parentInfo")
.populate("vaccine", "name")
```

### 3. Pour chaque vaccination
```
1. Vérifier parentInfo.parentPhone existe
2. Vérifier qu'aucun rappel n'a été envoyé aujourd'hui
3. Calculer jours restants (J-5, J-4, ..., J-1, J-0)
4. Créer message personnalisé
5. Sauvegarder notification en base
6. Envoyer via Socket.io (temps réel)
7. Envoyer via WhatsApp/SMS
```

### 4. Anti-doublon
```javascript
hasReminderBeenSentToday(childId, vaccinationId)
→ Cherche notification créée aujourd'hui
→ Si existe : Skip
→ Si n'existe pas : Envoyer
```

---

## 💬 Messages Envoyés

### J-5 à J-2 : Rappel standard
```
📅 Rendez-vous dans X jours

Bonjour [ParentName], rappel : le rendez-vous de vaccination [VaccineName] 
pour votre enfant [ChildName] est prévu dans X jours (DD/MM/YYYY). 
Notez bien cette date !
```

### J-1 : Rappel demain
```
⏰ Rendez-vous demain !

Bonjour [ParentName], rappel : le rendez-vous de vaccination [VaccineName] 
pour votre enfant [ChildName] est DEMAIN (DD/MM/YYYY). 
Préparez le carnet de santé de votre enfant.
```

### J-0 : Rappel aujourd'hui
```
📅 Rendez-vous aujourd'hui !

Bonjour [ParentName], le rendez-vous de vaccination [VaccineName] 
pour votre enfant [ChildName] est AUJOURD'HUI. 
N'oubliez pas de vous rendre à votre centre de santé.
```

---

## 📊 Données Sauvegardées

### Collection : `notifications`
```javascript
{
  title: "📅 Rendez-vous dans 3 jours",
  message: "Bonjour Fatou, rappel : ...",
  type: "info",
  targetRoles: ["user"],
  metadata: {
    childId: "123abc",
    vaccinationId: "456def",
    reminderType: "vaccination_reminder",
    daysRemaining: 3
  },
  createdAt: ISODate("2025-11-20T09:00:00Z")
}
```

---

## 🔌 Socket.io

### Rooms ciblées
```javascript
[
  "parent",                              // Tous les parents
  "all",                                 // Tous les utilisateurs
  "child_${childId}",                    // Enfant spécifique
  "parent_${parentPhone}_child_${childId}" // Parent + Enfant spécifique
]
```

### Événement émis
```javascript
socket.emit("newNotification", {
  title: "📅 Rendez-vous dans 3 jours",
  message: "...",
  type: "info",
  icon: "📅",
  date: "2025-11-20T09:00:00.000Z"
})
```

---

## 📱 Réception Mobile

### Flutter : `ModernDashboardScreen`
1. Socket.io reçoit l'événement `newNotification`
2. Affiche SnackBar en temps réel
3. Sauvegarde dans cache local : `cached_notifications_{childId}`
4. Incrémente compteur de notifications

### Format cache local
```dart
{
  'title': '📅 Rendez-vous dans 3 jours',
  'message': '...',
  'icon': '📅',
  'type': 'info',
  'date': '2025-11-20T09:00:00.000Z',
  'read': false,
  'id': '1732096800000_Rendez-vous dans 3 jours'
}
```

---

## 🧪 Tests

### Test manuel immédiat
```bash
# Méthode 1 : Script automatique
cd /Users/macretina/Vacxcare/vacxcare-backend
./test-rappels.sh

# Méthode 2 : curl
curl http://localhost:5000/api/test/vaccination-reminders

# Méthode 3 : Navigateur
http://localhost:5000/api/test/vaccination-reminders
```

### Test du CRON automatique

#### Option A : Modifier temporairement la fréquence
```typescript
// Dans vaccinationRemindersCron.ts
// Remplacer "0 9 * * *" par "*/2 * * * *" (toutes les 2 minutes)
cron.schedule("*/2 * * * *", async () => {
  await sendVaccinationReminders();
});
```

#### Option B : Attendre 9h00
Le système s'exécutera automatiquement chaque jour à 9h00.

### Scénarios de test

| Scénario | Vaccination | Résultat attendu |
|----------|-------------|------------------|
| J-3 | Dans 3 jours | "Rendez-vous dans 3 jours" |
| J-1 | Demain | "Rendez-vous demain !" |
| J-0 | Aujourd'hui | "Rendez-vous aujourd'hui !" |
| J-10 | Dans 10 jours | Aucun rappel (hors période) |
| J-3 (2x) | Dans 3 jours | 1er rappel OK, 2e skippé |
| Pas de parent | N/A | "Pas d'informations parent" |

---

## 📈 Logs à Observer

### Au démarrage du serveur
```
✅ CRON des rappels de vaccination configuré (exécution quotidienne à 9h00)
⏰ CRON des rappels de vaccination activé !
```

### Lors de l'exécution
```
🔔 Démarrage du service de rappels de vaccination...
📊 2 vaccination(s) programmée(s) dans les 5 prochains jours
💉 Envoi rappel vaccination à Fatou Diop...
✅ Rappel envoyé à Fatou Diop pour Amadou - BCG (dans 3 jour(s))
🎉 Rappels terminés : 2 envoyé(s), 0 déjà envoyé(s) aujourd'hui
```

### Cas particuliers
```
⚠️ Pas d'informations parent pour l'enfant Amadou
⏭️ Rappel déjà envoyé aujourd'hui pour Fatou - BCG
⚠️ Pas de date programmée pour Mariama - Polio
❌ Erreur envoi WhatsApp/SMS pour Aissatou: [error details]
```

---

## 🔐 Sécurité et Fiabilité

### Anti-doublon
- ✅ Vérification par jour via `hasReminderBeenSentToday()`
- ✅ Recherche dans `notifications` avec `metadata.reminderType`
- ✅ Un seul rappel par vaccination par jour

### Gestion d'erreur
- ✅ Continue même si WhatsApp/SMS échoue
- ✅ Log des erreurs pour debugging
- ✅ Validation des données (parentPhone, scheduledDate)

### Performance
- ✅ Requête optimisée avec filtres MongoDB
- ✅ Populate limité aux champs nécessaires
- ✅ Traitement asynchrone

---

## 📊 Statistiques Disponibles

### Requêtes MongoDB utiles

#### Rappels envoyés aujourd'hui
```javascript
db.notifications.find({
  "metadata.reminderType": "vaccination_reminder",
  createdAt: { 
    $gte: new Date(new Date().setHours(0,0,0,0)) 
  }
}).count()
```

#### Rappels par enfant
```javascript
db.notifications.aggregate([
  { $match: { "metadata.reminderType": "vaccination_reminder" } },
  { $group: { _id: "$metadata.childId", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

#### Taux de rappels par jour
```javascript
db.notifications.aggregate([
  { $match: { "metadata.reminderType": "vaccination_reminder" } },
  { $group: { 
    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
    count: { $sum: 1 }
  }},
  { $sort: { _id: -1 } }
])
```

---

## 🔧 Configuration

### Variables d'environnement (.env)
```env
# Twilio (WhatsApp + SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
MOCK_SMS=false

# Base de données
MONGO_URI=mongodb+srv://...

# JWT
JWT_SECRET=monSuperSecret
```

### Modifier la fréquence du CRON
```typescript
// Dans vaccinationRemindersCron.ts
cron.schedule("0 9 * * *", async () => { // 9h00 quotidien
  await sendVaccinationReminders();
});

// Exemples d'autres fréquences :
// "0 */6 * * *"   → Toutes les 6 heures
// "0 8,12,18 * * *" → 8h, 12h et 18h
// "*/30 * * * *"  → Toutes les 30 minutes
```

### Modifier la période de rappel (5 jours)
```typescript
// Dans vaccinationReminder.ts, ligne 58
const fiveDaysLater = new Date(today);
fiveDaysLater.setDate(fiveDaysLater.getDate() + 5); // Modifier ici

// Exemples :
// + 3  → 3 jours avant
// + 7  → 1 semaine avant
// + 14 → 2 semaines avant
```

---

## 🚀 Améliorations Futures Possibles

1. **Personnalisation par utilisateur**
   - Fréquence configurable par parent
   - Heure d'envoi préférée

2. **Rappels intelligents**
   - Adaptation selon historique de présence
   - Rappels plus fréquents pour parents absents

3. **Multi-langues**
   - Wolof, Pulaar, Sérère, etc.
   - Détection automatique de la langue

4. **Statistiques avancées**
   - Taux d'ouverture des notifications
   - Corrélation rappels → présence aux RDV
   - Dashboard pour le national

5. **Rappels post-vaccination**
   - Confirmation de vaccination
   - Rappels de doses suivantes
   - Conseils post-vaccination

6. **Canaux supplémentaires**
   - Appels vocaux automatiques
   - Notifications push natives
   - Email (pour comptes web)

---

## 📞 Support et Dépannage

### Problèmes courants

**Le CRON ne démarre pas**
- Vérifier les logs au démarrage : `✅ CRON des rappels de vaccination configuré`
- Vérifier la syntaxe dans `vaccinationRemindersCron.ts`

**Aucun rappel envoyé**
- Vérifier qu'il y a des vaccinations avec `status: "scheduled"`
- Vérifier que `scheduledDate` est dans les 5 prochains jours
- Vérifier que l'enfant a un `parentInfo.parentPhone`

**WhatsApp/SMS ne fonctionne pas**
- Vérifier la configuration Twilio dans `.env`
- Vérifier `MOCK_SMS=false`
- Le système continue même si ça échoue (pas bloquant)

**Notifications non reçues sur mobile**
- Vérifier que le mobile est connecté (Socket.io)
- Vérifier les rooms dans les logs serveur
- Vérifier le cache local du mobile

---

## ✅ Checklist de Vérification

Avant de déployer en production :

- [ ] CRON activé au démarrage du serveur
- [ ] Test manuel réussi (`/api/test/vaccination-reminders`)
- [ ] Twilio configuré correctement
- [ ] Notifications Socket.io fonctionnelles
- [ ] Cache mobile mis à jour
- [ ] Anti-doublon testé
- [ ] Logs vérifiés
- [ ] Base de données vérifiée
- [ ] Performance acceptable (< 5s pour 100 vaccinations)
- [ ] Documentation à jour

---

**Système de Rappels Automatiques de Vaccination** 🔔  
*Version 1.0 - Novembre 2025*  
*Prêt pour la production !* 🚀
