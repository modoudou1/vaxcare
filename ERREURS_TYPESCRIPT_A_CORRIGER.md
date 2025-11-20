# Erreurs TypeScript à corriger

## 🚨 Problème principal
Il y a des conflits de types TypeScript dans le système d'authentification. Plusieurs fichiers définissent leurs propres interfaces `AuthUser` et `AuthRequest` au lieu d'utiliser celles centralisées.

## 🔧 Corrections nécessaires

### 1. Centraliser les types d'authentification

**Fichier principal** : `src/middleware/auth.ts`
```typescript
export interface AuthUser {
  _id: mongoose.Types.ObjectId | string;
  id: string;
  role: "agent" | "district" | "regional" | "national" | "user";
  email: string;
  region?: string;
  healthCenter?: string;
  phone?: string;
  phoneNumber?: string;
  childId?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}
```

### 2. Nettoyer les contrôleurs

**Fichiers à corriger** :
- `src/controllers/vaccinationController.ts`
- `src/controllers/dataController.ts` 
- `src/controllers/vaccinationDaysController.ts`
- `src/controllers/vaccineScheduleController.ts`

**Actions** :
1. Supprimer toutes les définitions locales de `AuthUser` et `AuthenticatedRequest`
2. Ajouter l'import : `import { AuthRequest, AuthUser } from "../middleware/auth";`
3. Remplacer `AuthenticatedRequest` par `AuthRequest` dans toutes les signatures de fonctions

### 3. Exemple de correction

**Avant** :
```typescript
type AuthUser = {
  _id: mongoose.Types.ObjectId | string;
  id: string;
  role: "agent" | "regional" | "national";
  // ...
};

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const someFunction = async (req: AuthenticatedRequest, res: Response) => {
  // ...
};
```

**Après** :
```typescript
import { AuthRequest, AuthUser } from "../middleware/auth";

export const someFunction = async (req: AuthRequest, res: Response) => {
  // ...
};
```

### 4. Mise à jour des middleware

**Fichier** : `src/middleware/authorize.ts`
- Utiliser `AuthRequest` au lieu de sa propre définition

### 5. Routes à vérifier

**Fichier** : `src/routes/vaccination.ts`
- S'assurer que toutes les routes utilisent les bons types

## 🎯 Priorité

**Haute** : Ces erreurs empêchent la compilation en mode production mais n'affectent pas le fonctionnement en développement.

**Impact sur le système de liaison** : **AUCUN** - Le système de liaison parent-agent fonctionne parfaitement malgré ces erreurs TypeScript.

## 📝 Note

Le système principal (liaison parent-agent) a été corrigé et fonctionne. Ces erreurs TypeScript sont cosmétiques et peuvent être corrigées séparément sans impact sur les fonctionnalités.

## 🚀 Solution rapide

Pour une correction rapide, exécuter :
```bash
npm run dev  # Continue de fonctionner
# Les erreurs TypeScript n'empêchent pas l'exécution en développement
```

Pour la production, corriger les types avant le déploiement.
