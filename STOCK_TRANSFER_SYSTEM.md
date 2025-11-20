# Système de Transfert Hiérarchique des Stocks et Lots

## 📋 Vue d'ensemble

Système complet de gestion des stocks de vaccins avec transferts en cascade :
**National → Régional → District → Acteurs de Santé**

## 🏗️ Architecture Backend

### 1. Modèles de données

#### Stock (`/models/Stock.ts`)
```typescript
{
  vaccine: string,              // Nom du vaccin
  batchNumber: string,          // Numéro du lot
  quantity: number,             // Quantité disponible
  expirationDate: Date,         // Date d'expiration
  level: "national" | "regional" | "district" | "agent",  // ✨ NOUVEAU
  region?: string,              // Si level >= regional
  healthCenter?: string,        // Si level >= district
  createdBy: ObjectId,          // Créateur
}
```

**Champ clé `level`** :
- Détermine qui possède actuellement le stock
- Permet le filtrage précis par niveau hiérarchique
- Facilite les transferts en cascade

#### StockTransfer (`/models/StockTransfer.ts`)
```typescript
{
  stock: ObjectId,              // Référence au stock
  vaccine: string,
  batchNumber: string,
  quantity: number,             // Quantité transférée
  
  // Hiérarchie
  fromLevel: "national" | "regional" | "district" | "agent",
  toLevel: "national" | "regional" | "district" | "agent",
  
  // Source
  fromRegion?: string,
  fromHealthCenter?: string,
  fromUser: ObjectId,
  
  // Destination
  toRegion?: string,
  toHealthCenter?: string,
  toUser?: ObjectId,
  
  // Statut
  status: "pending" | "accepted" | "rejected" | "cancelled",
  transferDate: Date,
  acceptedDate?: Date,
  rejectedDate?: Date,
  notes?: string,
}
```

### 2. Contrôleurs

#### `stockController.ts`
- **Modifié** : Ajout du champ `level` lors de la création
- **Modifié** : Filtrage par `level` dans `getStocks()`
- Création, lecture, mise à jour, suppression des stocks
- Notifications automatiques (stock bas, expiration)

#### `stockTransferController.ts` (✨ NOUVEAU)

**`initiateTransfer()`**
- Valide la quantité disponible
- Détermine automatiquement le niveau de destination
- Cherche l'utilisateur destinataire
- Décrémente temporairement le stock source
- Crée un transfert avec status "pending"
- Envoie une notification au destinataire

**`acceptTransfer()`**
- Vérifie que l'utilisateur est autorisé
- Crée ou met à jour le stock destination avec le bon `level`
- Marque le transfert comme "accepted"
- Notifie l'expéditeur

**`rejectTransfer()`**
- Restaure la quantité dans le stock source
- Marque le transfert comme "rejected"
- Enregistre la raison du rejet
- Notifie l'expéditeur

**`getIncomingTransfers()`**
- Liste les transferts reçus (pending + historique)

**`getOutgoingTransfers()`**
- Liste les transferts envoyés (pending + historique)

**`getTransferHistory()`**
- Historique complet (envoyés + reçus)

### 3. Routes API (`/routes/stock.ts`)

```
POST   /api/stocks/transfers/initiate          - Initier un transfert
PUT    /api/stocks/transfers/:id/accept        - Accepter un transfert
PUT    /api/stocks/transfers/:id/reject        - Rejeter un transfert
GET    /api/stocks/transfers/incoming          - Transferts reçus
GET    /api/stocks/transfers/outgoing          - Transferts envoyés
GET    /api/stocks/transfers/history           - Historique complet
```

**Permissions** :
- **Initiate** : national, regional, district
- **Accept/Reject** : regional, district, agent
- **View** : Tous les niveaux

## 🎨 Architecture Frontend

### Composants créés

#### `TransferModal.tsx` (National)
- Modal de transfert pour le niveau national
- Sélection de la région de destination
- Saisie de la quantité
- Aperçu du transfert avant validation
- Gestion d'erreurs

#### `TransferHistory.tsx` (National)
- Affiche l'historique des transferts sortants
- Filtres : Tous, En attente, Acceptés, Rejetés
- Badges de statut colorés
- Détails de chaque transfert

### Pages existantes à mettre à jour

Les pages suivantes existent déjà et peuvent intégrer les nouveaux composants :
- `/nationals/stocks/page.tsx` - ✅ Utilise `TransferModal` et `TransferHistory`
- `/regionals/stocks/page.tsx` - À mettre à jour
- `/agent/stocks/page.tsx` - À mettre à jour

## 🔄 Flux de transfert complet

### Exemple : National → Régional → District → Agent

#### Étape 1 : National crée un stock
```typescript
POST /api/stocks
{
  vaccine: "BCG",
  batchNumber: "LOT2024-001",
  quantity: 10000,
  expirationDate: "2025-12-31",
  level: "national"  // ✨ Automatique
}
```

#### Étape 2 : National transfère vers Région Dakar
```typescript
POST /api/stocks/transfers/initiate
{
  stockId: "stock_id",
  quantity: 3000,
  toRegion: "Dakar"
}
```
- Stock national : 10000 → 7000
- Transfert créé (status: "pending")
- Notification envoyée au régional de Dakar

#### Étape 3 : Régional accepte
```typescript
PUT /api/stocks/transfers/{transfer_id}/accept
```
- Nouveau stock créé : level="regional", region="Dakar", quantity=3000
- Transfert : status="accepted"
- Notification envoyée au national

#### Étape 4 : Régional transfère vers District Thiès
```typescript
POST /api/stocks/transfers/initiate
{
  stockId: "stock_regional_id",
  quantity: 1000,
  toHealthCenter: "District de Thiès"
}
```
- Stock régional : 3000 → 2000
- Notification au district de Thiès

#### Étape 5 : District accepte et transfère vers Centre de Santé
```typescript
// 1. Accepte le transfert régional
PUT /api/stocks/transfers/{transfer_id}/accept

// 2. Transfère vers un centre de santé
POST /api/stocks/transfers/initiate
{
  stockId: "stock_district_id",
  quantity: 300,
  toHealthCenter: "Centre de Santé Mbour"
}
```
- Stock district : 1000 → 700
- Notification à l'agent du centre

#### Étape 6 : Agent accepte
```typescript
PUT /api/stocks/transfers/{transfer_id}/accept
```
- Stock agent créé : level="agent", healthCenter="Centre de Santé Mbour", quantity=300
- L'agent peut maintenant vacciner avec ce stock

## 📊 Filtrage des stocks par niveau

Chaque utilisateur voit **uniquement** ses stocks :

```typescript
// National
query = { level: "national" }

// Régional
query = { level: "regional", region: user.region }

// District
query = { level: "district", region: user.region, healthCenter: user.healthCenter }

// Agent
query = { level: "agent", healthCenter: user.healthCenter }
```

## 🔔 Notifications

### Événements notifiés :
1. **Transfert reçu** : "Vous avez reçu une demande de transfert..."
2. **Transfert accepté** : "Votre transfert a été accepté"
3. **Transfert rejeté** : "Votre transfert a été rejeté. Raison: ..."

### Envoi via :
- Socket.io en temps réel
- Sauvegarde en base de données
- Ciblage par rôle

## ✅ Avantages du système

1. **Traçabilité complète** : Chaque transfert est enregistré avec dates et statuts
2. **Validation à chaque étape** : Le destinataire doit accepter
3. **Sécurité** : Impossible de transférer plus que disponible
4. **Hiérarchie respectée** : National → Regional → District → Agent
5. **Notifications en temps réel** : Tout le monde est informé
6. **Restauration automatique** : Si rejet, quantité restaurée

## 🚀 Utilisation

### Pour le National :
1. Créer des stocks de vaccins (niveau national)
2. Transférer vers les régions
3. Suivre l'historique des transferts
4. Voir la distribution par région

### Pour le Régional :
1. Recevoir des stocks du national
2. Accepter ou rejeter les transferts
3. Transférer vers les districts
4. Suivre ses stocks régionaux

### Pour le District :
1. Recevoir des stocks du régional
2. Accepter ou rejeter les transferts
3. Transférer vers les acteurs de santé (centres, postes, cases)
4. Suivre ses stocks de district

### Pour l'Agent :
1. Recevoir des stocks du district
2. Accepter ou rejeter les transferts
3. Utiliser les stocks pour vacciner
4. Suivre son stock local

## 🔧 Migration des données existantes

Si vous avez des stocks sans le champ `level`, exécutez ce script dans MongoDB :

```javascript
// Mettre à jour les stocks existants
db.stocks.updateMany(
  { level: { $exists: false } },
  { $set: { level: "national" } }
);

// Ou selon votre logique :
db.stocks.updateMany(
  { region: { $exists: true }, healthCenter: { $exists: true } },
  { $set: { level: "agent" } }
);

db.stocks.updateMany(
  { region: { $exists: true }, healthCenter: { $exists: false } },
  { $set: { level: "regional" } }
);

db.stocks.updateMany(
  { region: { $exists: false } },
  { $set: { level: "national" } }
);
```

## 📝 TODO / Améliorations futures

- [ ] Interface UI pour les transferts dans toutes les pages (régional, district, agent)
- [ ] Dashboard des transferts en attente
- [ ] Statistiques de distribution
- [ ] Export des transferts en CSV/PDF
- [ ] Notifications email pour les transferts importants
- [ ] Rappels automatiques pour les transferts en attente > 7 jours
- [ ] Validation en masse (accepter plusieurs transferts)
- [ ] Annulation de transfert avant acceptation

## 🐛 Debug

**Problème : Transfert échoue**
- Vérifier que la quantité est disponible
- Vérifier que le niveau de destination est correct
- Vérifier les permissions de l'utilisateur

**Problème : Stocks ne s'affichent pas**
- Vérifier le champ `level` dans MongoDB
- Vérifier les filtres dans `getStocks()`
- Vérifier la région/healthCenter de l'utilisateur

**Problème : Notification non reçue**
- Vérifier Socket.io connection
- Vérifier le targetRole dans la notification
- Vérifier les logs serveur
