# 📦 Transfert de stocks pour District et Agent

## Vue d'ensemble

Ajout de la fonctionnalité de transfert de stock pour les rôles **District** et **Agent** avec des destinataires spécifiques selon le rôle.

---

## 🎯 Fonctionnalités

### 1. **District** 🏛️
- **Peut transférer vers** : Les acteurs de santé sous sa supervision (cases, postes, cliniques)
- **Voit** : Liste des structures de santé de son district (excluant les autres districts)
- **Exemple** : District Thiès peut transférer vers :
  - Case de Santé Mbour
  - Poste de Santé Joal
  - Clinique Thiès

### 2. **Agent** 👥
- **Peut transférer vers** : Les membres de son équipe (autres agents du même centre)
- **Voit** : Liste des agents de son centre de santé
- **Exemple** : Agent de "Case de Santé Mbour" peut transférer vers :
  - Dr. Fatou Sall (agent du même centre)
  - Infirmier Moussa Diop (agent du même centre)

---

## 🔧 Modifications backend

### 1. Nouveau endpoint : `GET /api/stocks/transfers/destinations`

Retourne les destinataires possibles selon le rôle de l'utilisateur.

**Fichier** : `/vacxcare-backend/src/controllers/stockTransferController.ts`

```typescript
export const getTransferDestinations = async (req: Request, res: Response) => {
  const user = (req as any).user;
  let destinations: any[] = [];

  if (user.role === "district") {
    // District → Acteurs de santé sous sa supervision
    const actors = await HealthCenter.find({
      $or: [
        { districtName: user.healthCenter },
        { district: user.healthCenter },
      ],
      type: { $ne: "district" }, // Exclure les districts
    }).select("name type").lean();
    
    destinations = actors.map((a: any) => ({
      type: "healthCenter",
      name: a.name,
      label: `${a.name} (${a.type || 'structure'})`,
      structureType: a.type,
    }));
  } else if (user.role === "agent") {
    // Agent → Membres de son équipe
    const teamMembers = await User.find({
      role: "agent",
      healthCenter: user.healthCenter,
      _id: { $ne: user.id }, // Exclure l'utilisateur actuel
    }).select("firstName lastName email").lean();
    
    destinations = teamMembers.map((member: any) => ({
      type: "teamMember",
      userId: member._id,
      name: `${member.firstName} ${member.lastName}`,
      label: `${member.firstName} ${member.lastName}`,
      email: member.email,
    }));
  }

  res.json({
    message: "Destinations récupérées",
    count: destinations.length,
    data: destinations,
  });
};
```

### 2. Modification de `initiateTransfer`

Ajout de la logique pour les agents qui transfèrent à leurs collègues.

```typescript
else if (user.role === "agent") {
  // Agent → Membre de l'équipe (autre agent du même centre)
  const { toUserId } = req.body;
  if (!toUserId) {
    return res.status(400).json({ error: "Membre de l'équipe de destination requis" });
  }
  toLevel = "agent";
  
  // Vérifier que le destinataire est bien un agent du même centre
  const teamMember = await User.findOne({ 
    _id: toUserId,
    role: "agent", 
    healthCenter: user.healthCenter 
  });
  
  if (!teamMember) {
    return res.status(400).json({ error: "Membre de l'équipe introuvable ou non autorisé" });
  }
  
  targetUser = teamMember._id;
  toHealthCenter = user.healthCenter; // Même centre
}
```

### 3. Routes mises à jour

**Fichier** : `/vacxcare-backend/src/routes/stock.ts`

```typescript
// Obtenir les destinataires possibles
router.get("/transfers/destinations", authMiddleware, roleCheck("national", "regional", "district", "agent"), getTransferDestinations);

// Initier un nouveau transfert (ajout du rôle "agent")
router.post("/transfers/initiate", authMiddleware, roleCheck("national", "regional", "district", "agent"), initiateTransfer);
```

---

## 🎨 Modifications frontend

### 1. Ajout du bouton de transfert

**Fichier** : `/vacxcare-frontend/src/app/agent/stocks/page.tsx`

```tsx
{/* Bouton Transférer (district et agent uniquement) */}
{(user?.role === "district" || user?.role === "agent") && stock.quantity > 0 && (
  <button
    onClick={() => handleOpenTransferModal(stock)}
    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
    title={user?.role === "district" ? "Transférer aux acteurs de santé" : "Transférer à un membre de l'équipe"}
  >
    <ArrowRightLeft className="h-4 w-4" />
  </button>
)}
```

### 2. Modal de transfert

Le modal affiche :
- **Informations du stock** : Vaccin, lot, quantité disponible
- **Sélecteur de destination** : Liste adaptée selon le rôle
- **Quantité à transférer** : Avec validation (max = quantité disponible)

```tsx
<form onSubmit={handleTransfer} className="space-y-4">
  <div>
    <label className="block text-sm font-medium mb-1">
      {user?.role === "district" && "Transférer vers (acteur de santé)"}
      {user?.role === "agent" && "Transférer vers (membre de l'équipe)"}
    </label>
    <select name="destination" required>
      <option value="">-- Sélectionner --</option>
      {destinations.map((dest, idx) => (
        <option 
          key={idx} 
          value={dest.type === "teamMember" ? dest.userId : dest.name}
        >
          {dest.label}
        </option>
      ))}
    </select>
  </div>
  <div>
    <label>Quantité à transférer (doses)</label>
    <input
      type="number"
      name="quantity"
      min="1"
      max={transferringStock.quantity}
      required
    />
  </div>
</form>
```

### 3. Fonction de transfert

```typescript
const handleTransfer = async (e: React.FormEvent) => {
  e.preventDefault();
  const formElement = e.target as HTMLFormElement;
  const formData = new FormData(formElement);
  const quantity = Number(formData.get('quantity'));
  const destination = formData.get('destination') as string;

  const selectedDest = destinations.find(d => 
    d.type === "teamMember" ? d.userId === destination : d.name === destination
  );

  const transferData: any = {
    stockId: transferringStock._id,
    quantity,
  };

  // Ajouter les champs selon le type de destination
  if (selectedDest?.type === "healthCenter") {
    transferData.toHealthCenter = destination;
  } else if (selectedDest?.type === "teamMember") {
    transferData.toUserId = destination;
  }

  const response = await fetch(`${API_BASE_URL}/api/stocks/transfers/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(transferData),
  });

  if (response.ok) {
    await fetchStocks();
    setShowTransferModal(false);
    alert("Transfert effectué avec succès !");
  }
};
```

---

## 📊 Flux de données

### District → Acteur de santé

```
1. District clique sur "Transférer" pour un stock BCG (100 doses)
2. Frontend → GET /api/stocks/transfers/destinations
3. Backend → Retourne les acteurs de santé du district :
   - Case de Santé Mbour
   - Poste de Santé Joal
   - Clinique Thiès
4. District sélectionne "Case de Santé Mbour" et 50 doses
5. Frontend → POST /api/stocks/transfers/initiate
   {
     stockId: "abc123",
     quantity: 50,
     toHealthCenter: "Case de Santé Mbour"
   }
6. Backend :
   - Décrémente le stock du district : 100 - 50 = 50
   - Crée/incrémente le stock de la case : +50
   - Crée un transfert avec status "accepted"
   - Envoie notification à la case
7. Frontend → Recharge les stocks
```

### Agent → Membre de l'équipe

```
1. Agent clique sur "Transférer" pour un stock Polio (30 doses)
2. Frontend → GET /api/stocks/transfers/destinations
3. Backend → Retourne les membres de l'équipe :
   - Dr. Fatou Sall
   - Infirmier Moussa Diop
4. Agent sélectionne "Dr. Fatou Sall" et 10 doses
5. Frontend → POST /api/stocks/transfers/initiate
   {
     stockId: "xyz789",
     quantity: 10,
     toUserId: "user123"
   }
6. Backend :
   - Décrémente le stock de l'agent : 30 - 10 = 20
   - Crée/incrémente le stock de Dr. Fatou : +10
   - Crée un transfert avec status "accepted"
   - Envoie notification à Dr. Fatou
7. Frontend → Recharge les stocks
```

---

## 🧪 Test

### Test District

```bash
# 1. Se connecter en tant que district
Email : district.thies@vacxcare.sn
URL : http://localhost:3000/agent/stocks

# 2. Vérifications
✅ Icône de transfert (ArrowRightLeft) visible sur les stocks avec quantité > 0
✅ Cliquer sur l'icône ouvre le modal
✅ Modal affiche "Transférer vers (acteur de santé)"
✅ Liste des destinations affiche les acteurs de santé du district
✅ Ne montre PAS les autres districts
✅ Sélectionner un acteur et une quantité
✅ Cliquer "Transférer" → Succès
✅ Stock du district décrémenté
✅ Stock de l'acteur incrémenté
```

### Test Agent

```bash
# 1. Se connecter en tant qu'agent
Email : agent.mbour@vacxcare.sn
URL : http://localhost:3000/agent/stocks

# 2. Vérifications
✅ Icône de transfert visible sur les stocks avec quantité > 0
✅ Cliquer sur l'icône ouvre le modal
✅ Modal affiche "Transférer vers (membre de l'équipe)"
✅ Liste des destinations affiche les autres agents du même centre
✅ Ne montre PAS l'agent actuel
✅ Ne montre PAS les agents d'autres centres
✅ Sélectionner un membre et une quantité
✅ Cliquer "Transférer" → Succès
✅ Stock de l'agent décrémenté
✅ Stock du collègue incrémenté
```

### Test de validation

```bash
# Quantité invalide
✅ Quantité > stock disponible → Erreur "Quantité insuffisante"
✅ Quantité = 0 → Erreur de validation
✅ Quantité négative → Erreur de validation

# Destination invalide
✅ Aucune destination sélectionnée → Erreur "Veuillez sélectionner une destination"
✅ Agent essaie de transférer à un agent d'un autre centre → Erreur backend
```

---

## 🎨 Interface utilisateur

### Bouton de transfert
- **Couleur** : Violet (purple-600)
- **Icône** : ArrowRightLeft (flèches bidirectionnelles)
- **Position** : Avant les boutons Modifier et Supprimer
- **Condition** : Visible uniquement pour district et agent, si quantité > 0
- **Tooltip** :
  - District : "Transférer aux acteurs de santé"
  - Agent : "Transférer à un membre de l'équipe"

### Modal de transfert
- **Titre** : "Transférer un stock" avec icône
- **Encadré bleu** : Informations du stock (vaccin, lot, quantité disponible)
- **Sélecteur** : Dropdown avec les destinataires possibles
- **Champ quantité** : Input number avec min=1, max=quantité disponible
- **Boutons** :
  - Annuler (gris)
  - Transférer (violet avec icône)

---

## 📝 Résumé

✅ **District** : Peut transférer aux acteurs de santé sous sa supervision  
✅ **Agent** : Peut transférer aux membres de son équipe  
✅ **Endpoint** : `GET /api/stocks/transfers/destinations` pour récupérer les destinataires  
✅ **Endpoint** : `POST /api/stocks/transfers/initiate` modifié pour supporter les agents  
✅ **Frontend** : Bouton de transfert + modal adapté selon le rôle  
✅ **Validation** : Quantité, destination, permissions  
✅ **Notifications** : Envoyées au destinataire après transfert  

---

**Date** : 17 novembre 2024  
**Version** : 1.0.0  
**Fonctionnalité** : Transfert de stocks pour District et Agent
