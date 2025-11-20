# 🎨 VacxCare Mobile - Design System

## Vue d'ensemble

Design system moderne et cohérent pour l'application mobile VacxCare, basé sur le thème web avec une approche minimaliste et professionnelle.

---

## 🎨 Palette de couleurs

### Couleurs principales
- **Primary (Bleu sombre)**: `#0A1A33` - Couleur principale de la marque
- **Secondary (Bleu clair)**: `#3BA3E5` - Accents et actions secondaires

### Fond et surfaces
- **Background**: `#F8FAFC` - Fond principal de l'application
- **Surface**: `#FFFFFF` - Cartes et éléments en relief
- **Surface Variant**: `#F1F5F9` - Variante légère

### Texte
- **Text Primary**: `#0A1A33` - Titres et texte principal
- **Text Secondary**: `#64748B` - Sous-titres et descriptions
- **Text Tertiary**: `#94A3B8` - Labels et texte secondaire
- **Text Disabled**: `#CBD5E1` - Texte désactivé

### Statuts
- **Success (Vert)**: `#10B981` - Actions réussies, vaccins à jour
- **Warning (Orange)**: `#F59E0B` - Avertissements, vaccins en attente
- **Error (Rouge)**: `#EF4444` - Erreurs, vaccins en retard
- **Info (Bleu)**: `#3B82F6` - Informations, vaccins programmés

---

## 📏 Espacements

```dart
xxs = 2px  // Micro-espacement
xs  = 4px  // Extra small
sm  = 8px  // Small
md  = 16px // Medium (défaut)
lg  = 24px // Large
xl  = 32px // Extra large
xxl = 48px // Extra extra large
```

---

## 🔘 Rayons de bordure

```dart
xs   = 4px   // Bordures fines
sm   = 8px   // Small
md   = 12px  // Medium (défaut pour boutons/cards)
lg   = 16px  // Large (cards principales)
xl   = 24px  // Extra large
xxl  = 32px  // Headers/sections
full = 9999px // Cercles parfaits
```

---

## 🔤 Typographie

### Hiérarchie des titres
- **Display**: 40px, Bold - Écrans d'accueil
- **H1**: 32px, Bold - Titres principaux
- **H2**: 24px, SemiBold - Titres de sections
- **H3**: 20px, SemiBold - Sous-sections
- **H4**: 18px, SemiBold - Titres de cards

### Corps de texte
- **Body Large**: 16px, Regular - Texte principal
- **Body Medium**: 14px, Regular - Texte courant
- **Body Small**: 12px, Regular - Descriptions

### Éléments spéciaux
- **Button**: 16px, SemiBold - Boutons
- **Label**: 14px, Medium - Labels de formulaires
- **Caption**: 12px, Regular - Légendes
- **Overline**: 11px, SemiBold, Uppercase - En-têtes

---

## 🎯 Composants

### AppButton
Bouton principal de l'application avec états (loading, disabled, outlined).

```dart
AppButton(
  text: 'Continuer',
  onPressed: () {},
  icon: Icons.arrow_forward_rounded,
  isLoading: false,
  isOutlined: false,
)
```

### AppCard
Card standardisée avec ombres et bordures arrondies.

```dart
AppCard(
  onTap: () {},
  child: Text('Contenu'),
)
```

### StatCard
Card de statistique avec icône, valeur et label.

```dart
StatCard(
  label: 'Vaccins à jour',
  value: '8/12',
  icon: Icons.check_circle_outline,
  color: AppColors.success,
)
```

### InfoCard
Card d'information avec icône et trailing.

```dart
InfoCard(
  title: 'Rendez-vous',
  subtitle: '15 Novembre 2024',
  icon: Icons.calendar_today,
  color: AppColors.info,
  onTap: () {},
)
```

---

## 📱 Écrans implémentés

### ✅ Authentification
1. **Splash Screen** - Écran de démarrage avec logo animé
2. **Onboarding** - Introduction à l'application
3. **Login** - Connexion avec ID + téléphone
4. **Link Child** - Liaison du carnet de vaccination
5. **PIN Creation** ⭐ NOUVEAU - Création du code PIN
6. **PIN Confirmation** ⭐ NOUVEAU - Confirmation du code PIN

### 🏠 Dashboard
- Statistiques des vaccinations
- Prochains rendez-vous
- Accès rapide aux fonctionnalités

### 💉 Vaccinations
- Liste des vaccins
- Statuts (Fait, En attente, En retard, Programmé)
- Calendrier vaccinal

### 📅 Calendrier
- Vue mensuelle
- Rendez-vous programmés
- Alertes et rappels

### 📢 Campagnes
- Campagnes de vaccination en cours
- Informations et détails

### 💡 Conseils
- Conseils santé
- Recommandations

### 🔔 Notifications
- Alertes personnalisées
- Rappels de vaccinations

### 👤 Profil
- Informations de l'enfant
- Paramètres du compte
- Code PIN

---

## 🚀 Prochaines étapes

### À implémenter
1. ⬜ Dashboard modernisé
2. ⬜ Écran de vaccination avec filtres
3. ⬜ Calendrier interactif
4. ⬜ Détails des campagnes
5. ⬜ Profil avec édition
6. ⬜ Notifications avec historique
7. ⬜ Écran de conseils avec catégories

---

## 📐 Principes de design

### Simplicité
- Design épuré et minimaliste
- Pas de gradients
- Couleurs simples et claires

### Cohérence
- Utilisation systématique du design system
- Composants réutilisables
- Espacements standardisés

### Accessibilité
- Contrastes élevés pour la lisibilité
- Tailles de texte adaptées
- Zones de touch suffisantes (min 44x44px)

### Performance
- Animations fluides (60fps)
- Chargement optimisé
- Images optimisées

---

## 🎨 Exemples de mise en page

### Grid 2 colonnes (Stats)
```dart
GridView.count(
  crossAxisCount: 2,
  mainAxisSpacing: AppSpacing.md,
  crossAxisSpacing: AppSpacing.md,
  children: [
    StatCard(...),
    StatCard(...),
  ],
)
```

### Liste verticale
```dart
ListView.separated(
  itemCount: items.length,
  separatorBuilder: (_, __) => SizedBox(height: AppSpacing.sm),
  itemBuilder: (context, index) => InfoCard(...),
)
```

---

## 🔧 Configuration

### Fonts
Police principale: **Poppins** (Google Fonts)
- Regular: 400
- Medium: 500
- SemiBold: 600
- Bold: 700

### Theme
Appliquer le thème dans `main.dart`:
```dart
MaterialApp(
  theme: AppTheme.theme,
  ...
)
```

---

## 📚 Documentation des composants

Chaque composant est documenté avec:
- Description
- Paramètres obligatoires
- Paramètres optionnels
- Exemples d'utilisation
- Captures d'écran

---

**Version**: 1.0  
**Dernière mise à jour**: Novembre 2024  
**Designer**: VacxCare Team
