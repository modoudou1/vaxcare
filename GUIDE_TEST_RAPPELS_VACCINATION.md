# 🔔 Guide de Test - Système de Rappels de Vaccination

## ✅ Corrections Appliquées

Toutes les erreurs TypeScript ont été corrigées dans `/vacxcare-backend/src/services/vaccinationReminder.ts` :

1. ✅ Vérification de `scheduledDate` avant utilisation (évite `undefined`)
2. ✅ Conversion de `Date` en `string` pour `sendVaccinationNotification()`
3. ✅ Réutilisation de la variable `scheduledDate` pour éviter les conversions multiples

## 📋 Fonctionnement du Système

### Automatique (CRON Job)
- **Fréquence** : Tous les jours à 9h00 du matin
- **Période de rappel** : 5 jours avant le rendez-vous
- **Canal** : WhatsApp (prioritaire) + SMS (fallback)

### Types de rappels
- **J-5 à J-2** : "Rendez-vous dans X jours"
- **J-1** : "Rendez-vous demain !"
- **J-0** : "Rendez-vous aujourd'hui !"

### Anti-doublon
- Le système vérifie si un rappel a déjà été envoyé aujourd'hui
- Un seul rappel par vaccination par jour

## 🧪 Instructions de Test

### Étape 1 : Démarrer le serveur backend

```bash
cd /Users/macretina/Vacxcare/vacxcare-backend
npm run dev
```

**Vérifications au démarrage** :
- ✅ `✅ CRON des rappels de vaccination configuré (exécution quotidienne à 9h00)`
- ✅ Serveur sur port 5000

### Étape 2 : Créer une vaccination de test

Vous avez deux options :

#### Option A : Via l'interface web (Recommandé)
1. Connectez-vous en tant qu'agent
2. Allez dans "Enfants"
3. Sélectionnez un enfant avec un parent (numéro de téléphone)
4. Programmez un vaccin pour **dans 3 jours** (ou 1, 2, 4, 5 jours)
5. Assurez-vous que le parent a un numéro de téléphone valide

#### Option B : Via MongoDB directement
```javascript
// Se connecter à MongoDB et exécuter :
db.vaccinations.insertOne({
  child: ObjectId("ID_ENFANT_EXISTANT"),
  vaccine: ObjectId("ID_VACCIN_EXISTANT"),
  vaccineName: "BCG",
  status: "scheduled",
  scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Dans 3 jours
  doseNumber: 1,
  createdAt: new Date(),
  updatedAt: new Date()
});
```

### Étape 3 : Tester manuellement les rappels

Ouvrez votre navigateur ou utilisez `curl` :

```bash
# Test manuel (n'attendez pas 9h00)
curl http://localhost:5000/api/test/vaccination-reminders
```

**Ou dans le navigateur** :
```
http://localhost:5000/api/test/vaccination-reminders
```

### Étape 4 : Vérifier les résultats

#### Dans les logs du serveur
Vous devriez voir :
```
🔔 Démarrage du service de rappels de vaccination...
📊 X vaccination(s) programmée(s) dans les 5 prochains jours
✅ Rappel envoyé à [ParentName] pour [ChildName] - [VaccineName] (dans X jour(s))
🎉 Rappels terminés : X envoyé(s), X déjà envoyé(s) aujourd'hui
```

#### Dans la base de données (Notifications)
```javascript
db.notifications.find({ 
  "metadata.reminderType": "vaccination_reminder" 
}).sort({ createdAt: -1 }).limit(5)
```

#### Dans l'application mobile Flutter
1. Ouvrez l'app mobile
2. Si le parent est connecté, il devrait recevoir :
   - Une **SnackBar** en temps réel (Socket.io)
   - Une **notification** dans l'écran Notifications
   - Un **SMS/WhatsApp** sur son téléphone (si configuré)

#### Via WhatsApp/SMS
- Si Twilio est configuré, vérifiez le téléphone du parent
- Le message contiendra le nom du vaccin, de l'enfant et la date

### Étape 5 : Test du CRON automatique

Pour tester que le CRON fonctionne automatiquement :

1. **Option A : Modifier l'heure du CRON** (pour test immédiat)
   
   Éditez `/vacxcare-backend/src/cron/vaccinationRemindersCron.ts` :
   ```typescript
   // Remplacer temporairement :
   cron.schedule("0 9 * * *", async () => {
   // Par (toutes les 2 minutes) :
   cron.schedule("*/2 * * * *", async () => {
   ```
   
   Redémarrez le serveur et attendez 2 minutes.

2. **Option B : Attendre 9h00 du matin**
   
   Laissez le système tourner et vérifiez les logs à 9h00.

## 📊 Cas de Test Recommandés

### Test 1 : Rappel J-3
- Créer une vaccination pour dans **3 jours**
- Lancer le test
- Vérifier : "Rendez-vous dans 3 jours"

### Test 2 : Rappel J-1 (demain)
- Créer une vaccination pour **demain**
- Lancer le test
- Vérifier : "Rendez-vous demain !"

### Test 3 : Rappel J-0 (aujourd'hui)
- Créer une vaccination pour **aujourd'hui**
- Lancer le test
- Vérifier : "Rendez-vous aujourd'hui !"

### Test 4 : Anti-doublon
- Lancer le test une première fois
- Lancer le test une deuxième fois immédiatement
- Vérifier : "Rappel déjà envoyé aujourd'hui"

### Test 5 : Pas de parent
- Créer une vaccination pour un enfant sans `parentInfo.parentPhone`
- Lancer le test
- Vérifier : "Pas d'informations parent"

### Test 6 : Hors période
- Créer une vaccination pour dans **10 jours** (hors 5 jours)
- Lancer le test
- Vérifier : Aucun rappel envoyé

## 🔍 Troubleshooting

### Problème : Aucun rappel envoyé
- ✅ Vérifier qu'il y a des vaccinations avec `status: "scheduled"`
- ✅ Vérifier que `scheduledDate` est dans les 5 prochains jours
- ✅ Vérifier que l'enfant a un parent avec `parentInfo.parentPhone`

### Problème : Erreur WhatsApp/SMS
- ✅ Vérifier la configuration Twilio dans `.env`
- ✅ Vérifier que `MOCK_SMS=false`
- ✅ Le système continue même si WhatsApp échoue (pas bloquant)

### Problème : Notification non reçue sur mobile
- ✅ Vérifier que le mobile est connecté (Socket.io)
- ✅ Vérifier les rooms : `child_{childId}`, `parent_{phone}_child_{childId}`
- ✅ Vérifier les logs Socket.io dans le serveur

### Problème : CRON ne démarre pas
- ✅ Vérifier les logs au démarrage du serveur
- ✅ Vérifier qu'il n'y a pas d'erreur de syntaxe dans `vaccinationRemindersCron.ts`

## 📝 Exemple de Log Complet Réussi

```
🧪 Test manuel des rappels de vaccination...
🔔 Démarrage du service de rappels de vaccination...
📊 2 vaccination(s) programmée(s) dans les 5 prochains jours
💉 Envoi rappel vaccination à Fatou Diop...
✅ Rappel envoyé à Fatou Diop pour Amadou - BCG (dans 3 jour(s))
💉 Envoi rappel vaccination à Aissatou Fall...
✅ Rappel envoyé à Aissatou Fall pour Mariama - Polio (dans 1 jour(s))
🎉 Rappels terminés : 2 envoyé(s), 0 déjà envoyé(s) aujourd'hui
```

## 🎯 Prochaines Étapes (Améliorations Futures)

- [ ] Rappels configurables par type de vaccin (urgent vs normal)
- [ ] Fréquence de rappels personnalisable (1x, 2x, 3x par jour)
- [ ] Rappels post-vaccination (confirmation)
- [ ] Statistiques des rappels (taux d'ouverture, présence aux RDV)
- [ ] Support multi-langues (Wolof, Pulaar, etc.)

---

**Système développé et testé** 🚀  
*Pour toute question, vérifiez d'abord les logs du serveur et la base de données.*
