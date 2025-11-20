# Nouveau Flux d'Inscription Parent - VaxCare Mobile

## 📋 Vue d'ensemble

Le système propose maintenant **deux options d'accès** après le splash screen :
1. **Se connecter avec un code d'accès** (circuit existant) - Pour les parents dont l'enfant a été enregistré par un agent
2. **Créer un nouveau compte** (nouveau circuit) - Pour les parents qui s'inscrivent eux-mêmes

## 🎯 Objectif

Permettre aux parents ayant un enfant plus âgé (qui utilisait avant le carnet physique) de :
- S'inscrire directement dans l'application
- Enregistrer leur enfant
- Sélectionner les vaccins déjà faits
- Recevoir leur code d'accès par WhatsApp
- Accéder au dashboard avec un carnet vaccinal à jour

---

## 🔄 Flux Complet - Nouveau Parent

### 1️⃣ **Splash Screen** → **Écran de Choix**
**Fichier** : `vacxcare_mobile/lib/screens/auth/auth_option_screen.dart`

Deux options disponibles :
- **"Se connecter avec un code d'accès"** → `LoginScreen`
- **"Créer un nouveau compte"** → `ParentRegistrationScreen`

### 2️⃣ **Formulaire d'Inscription** (3 étapes)
**Fichier** : `vacxcare_mobile/lib/screens/auth/parent_registration_screen.dart`

**Étape 1 - Informations du parent** :
- Nom complet
- Numéro de téléphone (requis)
- Email (optionnel)

**Étape 2 - Informations de l'enfant** :
- Prénom
- Nom de famille
- Date de naissance (date picker)
- Genre (Garçon/Fille)

**Étape 3 - Informations complémentaires** :
- Adresse (optionnel)
- Région (optionnel)
- Centre de santé (optionnel)

**Validation** :
- Tous les champs requis sont validés
- Navigation avec indicateur de progression
- Possibilité de revenir en arrière

### 3️⃣ **Appel Backend - Inscription**
**Endpoint** : `POST /api/mobile/parent-register`

**Body** :
```json
{
  "parentName": "Amadou Diallo",
  "parentPhone": "771234567",
  "parentEmail": "amadou@example.com",
  "childFirstName": "Fatou",
  "childLastName": "Diallo",
  "childBirthDate": "2020-05-15T00:00:00.000Z",
  "childGender": "F",
  "address": "Quartier Médina, Dakar",
  "region": "Dakar",
  "healthCenter": "Centre de santé Médina"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Inscription réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "child": {
    "_id": "648a9b2c3f1e4a5d6c7b8e9f",
    "firstName": "Fatou",
    "lastName": "Diallo",
    "birthDate": "2020-05-15T00:00:00.000Z",
    "gender": "F",
    "parentName": "Amadou Diallo",
    "parentPhone": "771234567"
  }
}
```

**Actions backend** :
1. ✅ Créer l'enfant dans la base de données
2. 📱 Générer un code d'accès à 6 chiffres
3. 📨 Envoyer le code via WhatsApp + SMS (Twilio)
4. 🔑 Générer un JWT pour le parent
5. 📤 Retourner le token et les données de l'enfant

### 4️⃣ **Vérification du Code d'Accès**
**Fichier** : `vacxcare_mobile/lib/screens/auth/access_code_verification_screen.dart`

- Affichage d'un message indiquant l'envoi par WhatsApp
- Champ pour saisir le code à 6 chiffres
- Vérification via `POST /api/mobile/parent-link-auth`
- Navigation vers la création du PIN

### 5️⃣ **Création du Code PIN**
**Fichier** : `vacxcare_mobile/lib/screens/auth/create_pin_screen.dart`

**Modification** :
- Ajout du paramètre `isNewParent` (boolean)
- Si `isNewParent = true` → Navigation vers sélection de vaccins
- Si `isNewParent = false` → Navigation directe vers le dashboard

**Flux** :
1. Saisir un PIN à 4 chiffres
2. Confirmer le PIN
3. Sauvegarde locale + serveur via `POST /api/mobile/parent-pin/save`
4. Navigation conditionnelle

### 6️⃣ **Sélection des Vaccins Déjà Faits**
**Fichier** : `vacxcare_mobile/lib/screens/auth/vaccine_selection_screen.dart`

**Fonctionnalités** :
- Calcul automatique de l'âge de l'enfant
- Chargement du calendrier vaccinal depuis `GET /api/vaccine-calendar`
- Filtrage des vaccins jusqu'à l'âge actuel de l'enfant
- Interface avec checkboxes pour sélectionner les vaccins déjà faits
- Possibilité de continuer sans sélection

**Affichage pour chaque vaccin** :
- Nom du/des vaccin(s)
- Dose (ex: "1ère dose", "Dose unique")
- Âge recommandé (ex: "À la naissance", "2 mois")

**Validation** :
- Envoi de la liste des vaccins sélectionnés
- Appel `POST /api/mobile/children/:id/mark-vaccines-done`

### 7️⃣ **Marquage des Vaccins comme Faits**
**Endpoint** : `POST /api/mobile/children/:id/mark-vaccines-done`

**Body** :
```json
{
  "vaccines": [
    "648a9b2c3f1e4a5d6c7b8e9f_BCG",
    "648b9c3d4f2e5b6e7d8c9fa0_POLIO_0"
  ]
}
```

**Actions backend** :
1. Charger le calendrier vaccinal pour chaque vaccin sélectionné
2. Créer des vaccinations avec `status: "done"`
3. Définir la date actuelle comme `doneDate` et `administeredDate`
4. Ajouter la note "Vaccin déjà fait avant inscription"
5. Retourner le nombre de vaccins marqués

**Réponse** :
```json
{
  "success": true,
  "message": "5 vaccin(s) marqué(s) comme faits",
  "count": 5
}
```

### 8️⃣ **Accès au Dashboard**
**Navigation** : `ModernDashboardScreen`

Le parent accède au dashboard avec :
- ✅ Son carnet vaccinal à jour
- ✅ Les vaccins déjà faits marqués comme "done"
- ✅ Les vaccins restants calculés automatiquement selon l'âge
- ✅ Les notifications activées
- ✅ Socket.io connecté pour les mises à jour en temps réel

---

## 🆚 Comparaison des Flux

### Circuit Existant (Agent enregistre l'enfant)

```
Splash → LoginScreen → Saisie code d'accès + téléphone
     → CreatePinScreen (isNewParent=false)
     → ModernDashboardScreen
```

### Nouveau Circuit (Parent s'inscrit)

```
Splash → AuthOptionScreen → ParentRegistrationScreen (3 étapes)
     → Backend crée enfant + envoie code WhatsApp
     → AccessCodeVerificationScreen
     → CreatePinScreen (isNewParent=true)
     → VaccineSelectionScreen
     → Backend marque vaccins comme faits
     → ModernDashboardScreen
```

---

## 📱 Fichiers Créés/Modifiés

### Mobile (Flutter)

**Nouveaux écrans** :
- ✅ `lib/screens/auth/auth_option_screen.dart` - Écran de choix
- ✅ `lib/screens/auth/parent_registration_screen.dart` - Formulaire inscription (3 pages)
- ✅ `lib/screens/auth/access_code_verification_screen.dart` - Vérification code WhatsApp
- ✅ `lib/screens/auth/vaccine_selection_screen.dart` - Sélection vaccins déjà faits

**Écrans modifiés** :
- ✅ `lib/screens/splash/splash_screen.dart` - Navigation vers AuthOptionScreen
- ✅ `lib/screens/auth/create_pin_screen.dart` - Paramètre `isNewParent` + navigation conditionnelle

### Backend (Node.js/Express)

**Routes ajoutées** (`src/routes/mobile.ts`) :
- ✅ `POST /api/mobile/parent-register` - Inscription parent avec enfant
- ✅ `POST /api/mobile/children/:id/mark-vaccines-done` - Marquer vaccins comme faits

---

## 🔐 Sécurité

1. **Rate limiting** : `authLimiter` appliqué sur `/parent-register` (max 5 requêtes/minute)
2. **Validation** : Tous les champs requis sont validés côté backend
3. **JWT** : Token généré avec expiration 30 jours
4. **PIN hashé** : Sauvegarde via bcrypt (10 rounds)
5. **Code d'accès** : 6 chiffres aléatoires uniques

---

## 📨 Notifications

**Canal** : WhatsApp (priorité) + SMS (fallback)

**Message envoyé** (via Twilio) :
```
🎉 Bienvenue sur VaxCare !

Bonjour Amadou Diallo,

Votre enfant Fatou Diallo a été enregistré avec succès dans l'application VaxCare.

🔐 Votre code d'accès : 456789

📱 Pour accéder à votre carnet de santé digital :
1. Ouvrez l'application VaxCare
2. Entrez votre code d'accès
3. Créez votre code PIN à 4 chiffres

Besoin d'aide ? Contactez-nous !
```

---

## 📊 Calcul Automatique du Calendrier

**Logique** :
1. Calcul de l'âge en mois de l'enfant
2. Filtrage du calendrier vaccinal :
   - Si `specificAge` ≤ âge actuel → Afficher
   - Si `minAge` ≤ âge actuel → Afficher
3. Conversion des unités (semaines, mois, années → mois)
4. Tri par âge recommandé

**Exemple** :
- Enfant né le 15/05/2020 (3 ans = 36 mois)
- Vaccins affichés : BCG (naissance), Polio 0-3 (0-14 semaines), Pentavalent 1-3 (2-4-6 mois), RR1 (9 mois), etc.
- Vaccins non affichés : RR2 (15 mois si > 36 mois), etc.

---

## 🧪 Tests Recommandés

### Test 1 : Inscription Complète
1. Ouvrir l'app → Splash → Cliquer "Créer un nouveau compte"
2. Remplir formulaire en 3 étapes
3. Vérifier réception WhatsApp/SMS
4. Entrer code d'accès
5. Créer PIN
6. Sélectionner vaccins déjà faits
7. Vérifier dashboard avec vaccins marqués "done"

### Test 2 : Validation Formulaire
1. Essayer de passer à l'étape suivante sans remplir les champs requis
2. Vérifier messages d'erreur
3. Tester date picker pour date de naissance
4. Tester sélection genre

### Test 3 : Code d'Accès Invalide
1. Entrer un code incorrect
2. Vérifier message d'erreur

### Test 4 : Sélection Vaccins
1. Vérifier filtrage selon âge enfant
2. Tester sélection/désélection
3. Tester "Continuer sans sélection"
4. Vérifier création des vaccinations en base

### Test 5 : Circuit Existant
1. Se connecter avec code d'accès existant (enregistré par agent)
2. Vérifier que le flux normal fonctionne toujours

---

## 🚀 Déploiement

**Mobile** :
1. Recompiler l'application Flutter
2. Tester sur émulateur/device
3. Déployer sur stores (iOS/Android)

**Backend** :
1. Compiler TypeScript : `npm run build`
2. Redémarrer le serveur : `npm run start`
3. Vérifier logs d'inscription parent

---

## 📝 Logs Backend

**Inscription réussie** :
```
✅ Enfant créé par inscription parent: 648a9b2c3f1e4a5d6c7b8e9f
📱 Code d'accès envoyé via WhatsApp/SMS
```

**Marquage vaccins** :
```
📋 Marquage de 5 vaccins comme faits pour l'enfant 648a9b2c3f1e4a5d6c7b8e9f
✅ 5 vaccinations créées comme "done"
```

---

## ✅ Avantages du Nouveau Système

1. **Accessibilité** : Parents peuvent s'inscrire sans passer par un agent
2. **Historique complet** : Saisie des vaccins déjà faits = carnet à jour
3. **Autonomie** : Parent contrôle son inscription
4. **Traçabilité** : Tous les vaccins marqués avec note "avant inscription"
5. **Expérience fluide** : Guidage étape par étape
6. **Notifications** : Code d'accès par WhatsApp instantané
7. **Sécurité** : PIN + JWT pour protéger les données

---

## 🔧 Maintenance Future

**Points d'attention** :
- Vérifier le bon fonctionnement de Twilio (WhatsApp + SMS)
- Surveiller les logs d'inscription parent
- Optimiser le filtrage du calendrier vaccinal si nécessaire
- Ajouter des analytics sur le taux d'inscription parent vs agent

**Améliorations possibles** :
- Permettre l'upload de photos du carnet physique
- OCR pour extraire automatiquement les vaccins déjà faits
- Rappels automatiques pour les vaccins manquants détectés
- Interface de gestion pour les admins (voir les auto-inscriptions)
