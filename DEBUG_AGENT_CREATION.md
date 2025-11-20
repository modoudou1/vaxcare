# 🐛 Debug : Création de membres d'équipe par un agent

## Problème

L'agent `aminagueyesene@gmail.com` (facility_admin) ne peut pas créer de membres d'équipe. Erreur 403 sur `POST /api/users`.

## Diagnostic

### 1. Vérification de l'agent dans la base de données

```bash
node check-agent-level.js
```

**Résultat** :
- ✅ Email: aminagueyesene@gmail.com
- ✅ Role: agent
- ✅ HealthCenter: Centre de sante medina
- ✅ **AgentLevel: facility_admin** ← Le champ existe bien en base !

### 2. Vérification du middleware d'authentification

**Problème identifié** : Le middleware `authMiddleware` ne récupérait pas le champ `agentLevel` de la base de données.

**Fichier** : `/vacxcare-backend/src/middleware/auth.ts`

**Avant** :
```typescript
const dbUser = await User.findById(decoded.id).select(
  "role email region healthCenter active"  // ❌ Pas de agentLevel
);

req.user = {
  _id: dbUser._id,
  id: dbUser._id.toString(),
  role: dbUser.role,
  email: dbUser.email,
  region: dbUser.region,
  healthCenter: dbUser.healthCenter,
  // ❌ Pas de agentLevel
} as AuthUser;
```

**Après** :
```typescript
const dbUser = await User.findById(decoded.id).select(
  "role email region healthCenter active agentLevel"  // ✅ Ajout de agentLevel
);

req.user = {
  _id: dbUser._id,
  id: dbUser._id.toString(),
  role: dbUser.role,
  email: dbUser.email,
  region: dbUser.region,
  healthCenter: dbUser.healthCenter,
  agentLevel: (dbUser as any).agentLevel,  // ✅ Ajout de agentLevel
} as AuthUser;
```

### 3. Mise à jour du type AuthUser

**Fichier** : `/vacxcare-backend/src/middleware/auth.ts`

```typescript
export interface AuthUser {
  _id: mongoose.Types.ObjectId | string;
  id: string;
  role: "agent" | "regional" | "national" | "district" | "user";
  email: string;
  region?: string;
  healthCenter?: string;
  agentLevel?: "facility_admin" | "facility_staff";  // ✅ Ajout
  phone?: string;
  phoneNumber?: string;
  childId?: string;
}
```

### 4. Logs de debug ajoutés

**Fichier** : `/vacxcare-backend/src/controllers/userController.ts`

```typescript
export const createUser = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    
    console.log('\n🔍 === DEBUG createUser ===');
    console.log('Current User ID:', currentUser.id);
    console.log('Current User Email:', currentUser.email);
    console.log('Current User Role:', currentUser.role);
    console.log('Current User AgentLevel:', currentUser.agentLevel);  // ✅ Doit afficher "facility_admin"
    console.log('Current User HealthCenter:', currentUser.healthCenter);
    console.log('Current User Region:', currentUser.region);
    // ...
  }
};
```

## Logs actuels (problème)

```
🔍 === DEBUG createUser ===
Current User ID: 691af4cc953be22aeab1e9e2
Current User Email: aminagueyesene@gmail.com
Current User Role: agent
Current User AgentLevel: undefined  ← ❌ PROBLÈME !
Current User HealthCenter: Centre de sante medina
Current User Region: Dakar
Body - Role demandé: agent
Body - HealthCenter demandé: undefined
Body - Region demandé: undefined
❌ Aucun cas ne correspond !
   - currentUser.role: agent
   - currentUser.agentLevel: undefined
   - Condition agent + facility_admin: false
```

## Cause probable

Le token JWT utilisé par le frontend a été généré **AVANT** les modifications du middleware. Il ne contient donc pas le champ `agentLevel`.

## Solution

### Option 1 : Se déconnecter et se reconnecter (RECOMMANDÉ)

1. **Déconnectez-vous** du frontend (http://localhost:3000)
2. **Reconnectez-vous** avec `aminagueyesene@gmail.com`
3. Un nouveau token JWT sera généré avec le champ `agentLevel`
4. **Essayez à nouveau** de créer un membre d'équipe

### Option 2 : Vérifier si le select fonctionne

Les logs du middleware devraient afficher :
```
🔍 DEBUG authMiddleware - dbUser agentLevel: facility_admin
🔍 DEBUG authMiddleware - req.user.agentLevel: facility_admin
```

Si ces logs affichent `undefined`, alors le problème vient du `select` qui ne récupère pas le champ de la base.

## Logs attendus après correction

```
🔍 DEBUG authMiddleware - dbUser agentLevel: facility_admin
🔍 DEBUG authMiddleware - req.user.agentLevel: facility_admin

🔍 === DEBUG createUser ===
Current User ID: 691af4cc953be22aeab1e9e2
Current User Email: aminagueyesene@gmail.com
Current User Role: agent
Current User AgentLevel: facility_admin  ← ✅ CORRECT !
Current User HealthCenter: Centre de sante medina
Current User Region: Dakar
Body - Role demandé: agent
Body - HealthCenter demandé: undefined
Body - Region demandé: undefined
✅ Cas 4 détecté : Agent facility_admin
✅ Région forcée: Dakar
✅ HealthCenter forcé: Centre de sante medina
✅ AgentLevel résolu : facility_staff
```

## Flux de création d'un membre d'équipe

```
1. Agent facility_admin se connecte
2. Frontend → POST /api/users
   {
     email: "nouveau@example.com",
     role: "agent",
     firstName: "Nouveau",
     lastName: "Membre"
   }
3. Backend → authMiddleware vérifie le token
4. Backend → Récupère agentLevel de la base
5. Backend → createUser vérifie :
   - currentUser.role === "agent" ✅
   - currentUser.agentLevel === "facility_admin" ✅
6. Backend → Force region et healthCenter
7. Backend → Crée l'utilisateur avec agentLevel = "facility_staff"
8. Backend → Envoie email d'invitation
9. Frontend → Affiche succès
```

## Commandes utiles

```bash
# Vérifier l'agent dans la base
node check-agent-level.js

# Vérifier les membres de l'équipe
node debug-team.js

# Créer un deuxième agent (déjà fait)
node create-second-agent.js

# Tuer le backend
pkill -9 node

# Redémarrer le backend
cd /Users/macretina/Vacxcare/vacxcare-backend
npm run dev
```

## Fichiers modifiés

1. `/vacxcare-backend/src/middleware/auth.ts`
   - Ajout de `agentLevel` au type `AuthUser`
   - Ajout de `agentLevel` au select
   - Ajout de `agentLevel` à `req.user`
   - Ajout de logs de debug

2. `/vacxcare-backend/src/controllers/userController.ts`
   - Ajout de logs détaillés dans `createUser`
   - Ajout de logs dans le Cas 4 (agent facility_admin)

3. `/vacxcare-backend/src/controllers/stockTransferController.ts`
   - Correction de `toHealthCenter` → `destinationHealthCenter`
   - Ajout de support pour les agents qui transfèrent à leurs collègues

## Prochaines étapes

1. ✅ Se déconnecter et se reconnecter
2. ✅ Vérifier les logs du middleware
3. ✅ Essayer de créer un membre d'équipe
4. ✅ Vérifier que le membre est créé avec `agentLevel: "facility_staff"`
