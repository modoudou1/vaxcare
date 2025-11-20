# Filtrage District dans la page Agent/Enfants

## 📋 Résumé

La fonctionnalité de filtrage pour le rôle **District** a été intégrée directement dans la page **existante** `/agent/enfants` au lieu de créer une nouvelle page séparée.

## 🎯 Fonctionnalités ajoutées

### 1. **Statistiques adaptées au rôle**

#### Pour les utilisateurs **agent** et autres rôles :
- Total enfants
- À jour
- En retard
- RDV programmés

#### Pour les utilisateurs **district** :
- Total enfants
- **District Direct** (enfants du district)
- **Acteurs de Santé** (enfants des structures sous supervision)
- RDV programmés

### 2. **Filtres district (visible uniquement pour le rôle district)**

Trois boutons de filtrage apparaissent automatiquement pour les utilisateurs district :
- **Tous** : Affiche tous les enfants (district + acteurs)
- **District** : Uniquement les enfants du district direct
- **Acteurs** : Uniquement les enfants des acteurs de santé

### 3. **Badge de type dans le tableau**

Pour les utilisateurs district, chaque enfant affiche un badge :
- **Badge vert "District"** : Enfant enregistré directement au district
- **Badge violet "Acteur"** : Enfant d'un acteur de santé

### 4. **Deux types de modals selon l'origine de l'enfant**

#### Enfant du district direct → Modal complet
- Utilise `AgentChildDetailsModal`
- ✅ Programmation de vaccinations
- ✅ Marquer comme fait/raté
- ✅ Reprogrammer
- ✅ Toutes les actions de gestion

#### Enfant d'un acteur de santé → Modal en lecture seule
- Utilise `RegionalChildDetailsModal`
- ✅ Consultation du dossier
- ✅ Voir le carnet de vaccination
- ❌ Pas de programmation
- ❌ Pas de modification

## 📁 Fichiers modifiés

### 1. `/vacxcare-frontend/src/app/agent/enfants/ChildrenTab.tsx`

**Imports ajoutés :**
```typescript
import { Users } from "lucide-react"; // Icône pour "Acteurs de Santé"
import RegionalChildDetailsModal from "@/app/regional/enfants/ChildDetailsModal";
```

**États ajoutés :**
```typescript
const [isDistrictChild, setIsDistrictChild] = useState(false);
const [districtFilter, setDistrictFilter] = useState<"all" | "district" | "actors">("all");
const [healthCenters, setHealthCenters] = useState<any[]>([]);
```

**Logique de filtrage :**
- Charge les centres de santé si `user?.role === "district"`
- Filtre les enfants selon `districtFilter` en comparant `child.healthCenter` avec `user.healthCenter`
- Calcule les statistiques `districtDirect` et `districtActors`

**Affichage conditionnel :**
- Statistiques différentes selon le rôle
- Boutons de filtre district (visible uniquement si `user?.role === "district"`)
- Badge de type dans le tableau (visible uniquement pour district)
- Modal différent selon `isDistrictChild`

### 2. `/vacxcare-backend/src/middleware/auth.ts`

**Type `AuthUser` mis à jour :**
```typescript
role: "agent" | "district" | "regional" | "national" | "user";
```

**Type JWT décodé mis à jour :**
```typescript
role: "agent" | "district" | "regional" | "national" | "user";
```

## 🔍 Logique de distinction

```typescript
// Déterminer si l'enfant appartient au district direct
const isDirect = user?.role === "district" && c.healthCenter === user?.healthCenter;

// Lors du clic sur un enfant
onClick={() => {
  setSelectedChild(c);
  setIsDistrictChild(isDirect);
}}

// Affichage du modal approprié
{selectedChild && isDistrictChild && (
  <AgentChildDetailsModal /> // Modal complet
)}

{selectedChild && !isDistrictChild && user?.role === "district" && (
  <RegionalChildDetailsModal /> // Modal lecture seule
)}

{selectedChild && user?.role !== "district" && (
  <AgentChildDetailsModal /> // Modal normal pour les autres rôles
)}
```

## 🎨 Interface utilisateur

### Pour un utilisateur agent/régional/national
L'interface reste **identique** à avant, aucun changement visible.

### Pour un utilisateur district
Nouvelles fonctionnalités visibles :
1. **Statistiques** : 2ème et 3ème cartes affichent "District Direct" et "Acteurs de Santé"
2. **Filtres** : 3 boutons sous les filtres de statut
3. **Badge** : Colonne "Actions" affiche un badge vert/violet
4. **Modals** : Modal différent selon le type d'enfant

## 📊 Exemple de flux

### Utilisateur District "Thiès"

**Enfants dans la base :**
- Fatou (healthCenter: "District Thiès") → District direct
- Amadou (healthCenter: "Case de Santé Mbour") → Acteur
- Khadija (healthCenter: "Poste de Santé Joal") → Acteur

**Affichage :**
1. **Statistiques** :
   - Total : 3
   - District Direct : 1
   - Acteurs de Santé : 2

2. **Filtre "Tous"** : Affiche 3 enfants
3. **Filtre "District"** : Affiche 1 enfant (Fatou)
4. **Filtre "Acteurs"** : Affiche 2 enfants (Amadou, Khadija)

5. **Clic sur Fatou** :
   - Badge vert "District"
   - Modal complet avec programmation

6. **Clic sur Amadou** :
   - Badge violet "Acteur"
   - Modal en lecture seule

## 🚀 Utilisation

### Connexion avec compte district
```javascript
{
  email: "district.thies@vacxcare.sn",
  role: "district",
  healthCenter: "District Thiès"
}
```

### Navigation
1. Se connecter avec un compte district
2. Aller dans "Enfants" (route `/agent/enfants`)
3. Les filtres district apparaissent automatiquement
4. Utiliser les boutons pour filtrer
5. Cliquer sur un enfant pour voir le modal approprié

## 🔐 Sécurité et permissions

- Le filtrage est **automatique** basé sur `user?.role === "district"`
- Les enfants affichés sont **automatiquement filtrés** par le backend selon le `healthCenter` de l'utilisateur
- Les modals sont **conditionnels** selon l'origine de l'enfant
- Pas de protection de route supplémentaire nécessaire (utilise `/agent/*` existant)

## ✅ Avantages de cette approche

1. **Réutilisation du code** : Pas de duplication, utilise la page existante
2. **Maintenance facilitée** : Un seul endroit à maintenir
3. **Expérience utilisateur cohérente** : Même interface pour tous les rôles
4. **Conditionnalité élégante** : Les fonctionnalités s'activent automatiquement selon le rôle
5. **Pas de routes supplémentaires** : Utilise les routes `/agent/*` existantes

## 📝 Notes importantes

- Les filtres district n'apparaissent **que** si `user?.role === "district"`
- Les autres rôles (agent, régional, national) voient l'interface **normale**
- Le badge de type n'est visible **que** pour les utilisateurs district
- La recherche fonctionne aussi avec le **téléphone** maintenant

## 🐛 Dépannage

### Les filtres district ne s'affichent pas
- Vérifier que `user?.role === "district"`
- Vérifier que le token JWT contient le bon rôle
- Regarder les logs de la console navigateur

### Tous les enfants ont le même modal
- Vérifier que `user?.healthCenter` est défini
- Vérifier que les enfants ont un `healthCenter` correct
- La comparaison est stricte (sensible à la casse)

### Statistiques incorrectes
- Vérifier que les enfants sont bien filtrés par le backend
- Vérifier les `healthCenter` dans la base de données

---

**Date** : 17 novembre 2024  
**Version** : 1.0.0  
**Fichier principal modifié** : `/src/app/agent/enfants/ChildrenTab.tsx`
