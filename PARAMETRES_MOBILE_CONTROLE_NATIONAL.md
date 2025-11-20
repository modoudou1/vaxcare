# Contrôle des Paramètres Mobile par le National

## 📋 Vue d'ensemble

Le système permet maintenant à l'administrateur national de contrôler entièrement l'apparence et le contenu de l'application mobile depuis le dashboard web, incluant :
- Logo de l'application
- Nom et sous-titre de l'application
- Couleurs (fond, boutons)
- Images et textes des 3 slides d'onboarding

## 🎨 Paramètres Contrôlables

### Paramètres Généraux
- **Nom de l'application** : Affiché sur le splash screen et dans l'app
- **Sous-titre** : Texte sous le logo dans le splash screen
- **Logo** : Image affichée sur le splash screen et login

### Paramètres Visuels Mobile
- **Couleur de fond mobile** : Utilisée pour le splash screen et l'onboarding
- **Couleur des boutons** : Couleur des boutons dans l'onboarding

### Slides d'Onboarding (3 slides)
Pour chaque slide :
- **Image** : Image illustrative (upload depuis le dashboard)
- **Titre** : Titre principal du slide
- **Sous-titre** : Description détaillée

## 🔧 Backend

### Modèle de Données

**Fichier** : `vacxcare-backend/src/models/SystemSettings.ts`

```typescript
export interface ISystemSettings extends Document {
  appName: string;
  appSubtitle?: string;
  logoUrl: string;
  mobileBackgroundColor?: string;
  mobileButtonColor?: string;
  onboardingSlide1Image?: string;
  onboardingSlide1Title?: string;
  onboardingSlide1Subtitle?: string;
  // ... slides 2 et 3
}
```

### API Endpoints

**1. Récupération des settings (PUBLIC)**
```
GET /api/system-settings
```
Retourne tous les paramètres publics incluant les paramètres mobiles.
Accessible sans authentification pour permettre au mobile de les charger.

**2. Upload du logo**
```
POST /api/system-settings/upload-logo
Authorization: Bearer <token> (role: national)
Content-Type: multipart/form-data

Body:
- file: <fichier image PNG/JPG>
```

**3. Upload d'image d'onboarding**
```
POST /api/system-settings/upload-onboarding-image
Authorization: Bearer <token> (role: national)
Content-Type: multipart/form-data

Body:
- file: <fichier image PNG/JPG>
- slideNumber: 1|2|3
```

**4. Mise à jour des paramètres**
```
PUT /api/system-settings
Authorization: Bearer <token> (role: national)
Content-Type: application/json

Body: {
  "appName": "VaxCare",
  "appSubtitle": "Santé simplifiée",
  "mobileBackgroundColor": "#0A1A33",
  "mobileButtonColor": "#3B760F",
  "onboardingSlide1Title": "Mon titre",
  // ... autres paramètres
}
```

## 🖥️ Dashboard National

### Nouvel Onglet "Application Mobile"

**Fichier** : `vacxcare-frontend/src/app/nationalp/parametre/page.tsx`

L'onglet "Application Mobile" permet de :

1. **Paramètres Généraux Mobile**
   - Modifier le sous-titre de l'application
   - Choisir la couleur de fond mobile (color picker)
   - Choisir la couleur des boutons (color picker)

2. **Gestion des 3 Slides d'Onboarding**
   - Upload d'image pour chaque slide
   - Modification du titre
   - Modification du sous-titre
   - Prévisualisation de l'image uploadée

### Utilisation

1. Se connecter en tant que National
2. Aller dans **Paramètres Système**
3. Cliquer sur l'onglet **Application Mobile**
4. Modifier les paramètres souhaités
5. Uploader les images d'onboarding (optionnel)
6. Cliquer sur **Enregistrer**

## 📱 Application Mobile Flutter

### Nouveaux Fichiers

**1. Modèle de données**
```
vacxcare_mobile/lib/models/system_settings.dart
```
Définit la structure des settings système reçus depuis l'API.

**2. Service de récupération**
```
vacxcare_mobile/lib/services/settings_service.dart
```
Gère la récupération et la mise en cache des settings.

**Méthodes** :
- `getSystemSettings()` : Récupère les settings depuis l'API
- Cache local avec `flutter_secure_storage`
- Fallback sur valeurs par défaut en cas d'erreur

### Écrans Modifiés

**1. Splash Screen**
```
vacxcare_mobile/lib/screens/splash/splash_screen.dart
```

Modifications :
- Charge les settings au démarrage
- Utilise le logo uploadé (ou logo par défaut)
- Affiche le nom d'application configuré
- Affiche le sous-titre configuré
- Utilise la couleur de fond configurée

**2. Onboarding Screen**
```
vacxcare_mobile/lib/screens/onboarding/onboarding_screen.dart
```

Modifications :
- Accepte les settings en paramètre
- Utilise les images uploadées (ou images par défaut)
- Affiche les titres configurés
- Affiche les sous-titres configurés
- Utilise la couleur de fond configurée
- Utilise la couleur de bouton configurée

**3. Pin Login Screen**
```
vacxcare_mobile/lib/screens/auth/pin_login_screen.dart
```

Modification :
- Accepte les settings en paramètre (pour compatibilité)

### Gestion des Images

Le système supporte :
- **Images réseau** : URLs complètes (http/https) des images uploadées
- **Images locales** : Assets embarqués dans l'app (fallback)

Utilisation de `cached_network_image` pour :
- Cache automatique des images
- Placeholder pendant le chargement
- Fallback sur image locale en cas d'erreur

## 🔄 Flux de Fonctionnement

### 1. Configuration par le National

```
National Dashboard
    ↓
Onglet "Application Mobile"
    ↓
Modification des paramètres
    ↓
Upload des images
    ↓
Enregistrement
    ↓
Backend API (/api/system-settings)
    ↓
Base de données MongoDB
```

### 2. Utilisation par le Mobile

```
Lancement de l'app mobile
    ↓
Splash Screen
    ↓
Appel API GET /api/system-settings
    ↓
Réception des paramètres
    ↓
Mise en cache local
    ↓
Application des paramètres (logo, couleurs, textes)
    ↓
Navigation vers Onboarding
    ↓
Affichage des slides personnalisés
```

## 🎯 Avantages

### Pour le National
- **Contrôle total** sur l'apparence de l'app mobile
- **Personnalisation** selon la région/pays
- **Mise à jour en temps réel** sans recompiler l'app
- **Branding** : logo et couleurs de l'organisation

### Pour les Utilisateurs
- **Expérience cohérente** avec l'identité de l'organisation
- **Information locale** : textes adaptés au contexte
- **Interface moderne** : images et couleurs personnalisées

### Technique
- **Séparation des responsabilités** : contenu vs code
- **Scalabilité** : facile d'ajouter de nouveaux paramètres
- **Résilience** : cache local + fallback sur valeurs par défaut
- **Performance** : cache des images réseau

## 📝 Valeurs par Défaut

Si aucune configuration n'est faite ou en cas d'erreur :

```json
{
  "appName": "VaxCare",
  "appSubtitle": "Santé de votre enfant simplifiée",
  "mobileBackgroundColor": "#0A1A33",
  "mobileButtonColor": "#3B760F",
  "onboardingSlide1Title": "Calendrier vaccinal simplifié",
  "onboardingSlide1Subtitle": "Consultez tous les rendez-vous...",
  "onboardingSlide2Title": "Suivi professionnel et personnalisé",
  "onboardingSlide2Subtitle": "Des agents de santé qualifiés...",
  "onboardingSlide3Title": "Notifications et rappels intelligents",
  "onboardingSlide3Subtitle": "Ne manquez plus jamais un vaccin..."
}
```

## 🔒 Sécurité

- **Upload d'images** : Réservé au rôle `national`
- **Modification des settings** : Réservé au rôle `national`
- **Lecture des settings** : Public (pas d'authentification requise)
- **Validation** : Types de fichiers autorisés (PNG, JPG)
- **Limite de taille** : 5 MB par fichier

## 🧪 Test

### Test de l'API
```bash
# Récupération des settings (public)
curl http://localhost:5000/api/system-settings

# Upload d'une image d'onboarding (authentifié)
curl -X POST http://localhost:5000/api/system-settings/upload-onboarding-image \
  -H "Authorization: Bearer <token>" \
  -F "file=@image.png" \
  -F "slideNumber=1"

# Mise à jour des textes (authentifié)
curl -X PUT http://localhost:5000/api/system-settings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "Mon App",
    "onboardingSlide1Title": "Nouveau titre"
  }'
```

### Test Mobile
1. Lancer l'app mobile
2. Observer le splash screen (logo, nom, sous-titre)
3. Observer l'onboarding (images, textes, couleurs)
4. Modifier les paramètres dans le dashboard
5. Redémarrer l'app mobile
6. Vérifier que les nouveaux paramètres sont appliqués

## 📦 Dépendances Ajoutées

### Mobile Flutter
```yaml
dependencies:
  cached_network_image: ^3.3.0  # Cache des images réseau
  http: ^1.1.0                  # Requêtes HTTP
  flutter_secure_storage: ^9.0.0 # Stockage sécurisé
```

## 🚀 Déploiement

### Backend
1. Les images sont stockées dans `/vacxcare-backend/uploads/`
2. S'assurer que ce dossier est accessible en lecture
3. Configurer `BACKEND_URL` dans `.env`

### Frontend
Aucune configuration supplémentaire nécessaire.

### Mobile
1. S'assurer que l'URL de base pointe vers le bon serveur
2. Les images par défaut doivent être présentes dans `assets/images/`

## 📚 Maintenance

### Ajouter un Nouveau Paramètre

1. **Backend** : Ajouter le champ dans `ISystemSettings`
2. **Backend** : Ajouter le champ dans le schéma Mongoose
3. **Backend** : Ajouter le champ dans la réponse publique
4. **Frontend** : Ajouter le champ dans l'interface `SystemSettings`
5. **Frontend** : Ajouter le contrôle dans l'onglet Mobile
6. **Mobile** : Ajouter le champ dans le modèle `SystemSettings`
7. **Mobile** : Utiliser le champ dans les écrans concernés

### Modifier les Valeurs par Défaut

Modifier les valeurs dans :
- `vacxcare-backend/src/models/SystemSettings.ts` (schéma)
- `vacxcare_mobile/lib/services/settings_service.dart` (_getSettingsFromCache)
- `vacxcare_mobile/lib/models/system_settings.dart` (fromJson)

## ✅ Statut

- ✅ Backend API créée et testée
- ✅ Dashboard National mis à jour
- ✅ Service Flutter implémenté
- ✅ Splash Screen dynamique
- ✅ Onboarding dynamique
- ✅ Cache local fonctionnel
- ✅ Fallback sur valeurs par défaut
- ✅ Upload d'images opérationnel

---

**Date de création** : 10 Novembre 2025
**Version** : 1.0.0
**Auteur** : Système VaxCare
