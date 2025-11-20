# 🧪 Test des Noms de Vaccins Corrects

Guide rapide pour vérifier que tous les vaccins affichent leurs vrais noms (BCG, Penta 1, etc.) au lieu de "Vaccin inconnu".

---

## 🚀 1. Démarrage

### Backend
```bash
cd /Users/macretina/Vacxcare/vacxcare-backend
npm run dev
```

**Vérifiez:**
- ✅ Serveur sur `http://localhost:5000`
- ✅ MongoDB connecté

### Mobile
```bash
cd /Users/macretina/Vacxcare/vacxcare_mobile
flutter run -d chrome
```

---

## 📝 2. Scénario de Test Complet

### Étape 1: Inscription Parent

1. Cliquez "S'inscrire"
2. Remplissez:
   - Nom: `Test Parent`
   - Téléphone: `771234567`
   - Prénom enfant: `Fatou`
   - Nom enfant: `Diop`
   - Date naissance: **15/10/2024** (3 mois)
   - Sexe: F
3. Inscrivez

### Étape 2: Code & PIN

1. Entrez le code (dans les logs backend)
2. Créez PIN: `1234`

### Étape 3: Sélection Vaccins

**Période "À la naissance":**
- ✅ Cochez: **BCG**
- ✅ Cochez: **HepB 0**
- ❌ Laissez vide: VPO 0

**Période "6 semaines":**
- ✅ Cochez: **Penta 1**
- ✅ Cochez: **VPO 1**
- ❌ Laissez vide: Pneumo 1
- ❌ Laissez vide: Rota 1

**Période "10 semaines":**
- ❌ Laissez tout vide

Cliquez **"Terminer"**

### Étape 4: Logs Backend Attendus

```
📋 Marquage de 4 vaccins comme faits pour l'enfant 674...
👶 Âge de l'enfant: 3 mois

✅ 4 vaccinations créées comme "done":
   - BCG
   - HepB 0
   - Penta 1
   - VPO 1

⚠️ 7 vaccinations créées comme "missed":
   - VPO 0
   - Pneumo 1
   - Rota 1
   - Penta 2
   - VPO 2
   - Pneumo 2
   - Rota 2
```

---

## ✅ 3. Vérifications par Écran

### A. Dashboard - Activité Récente

**Navigation:** Automatique après sélection

**Attendu:**
```
📈 ACTIVITÉ RÉCENTE

⚠️ Vaccin Rota 2 raté           ← ✅ VRAI NOM
   Il y a quelques instants

⚠️ Vaccin Pneumo 2 raté         ← ✅ VRAI NOM
   Il y a quelques instants

✅ Vaccin Penta 1 administré    ← ✅ VRAI NOM
   Il y a quelques instants
```

**❌ Échoue si:**
- "Vaccin inconnu raté"
- "Vaccin inconnu administré"

---

### B. Écran Vaccinations

**Navigation:** Cliquez icône "Vaccins" (💉)

#### Onglet "Tous" (11 vaccins)

**Attendu:**
```
✅ BCG                          ← ✅ VRAI NOM
   1ère dose
   À la naissance

✅ HepB 0                       ← ✅ VRAI NOM
   À la naissance

⚠️ VPO 0                        ← ✅ VRAI NOM
   À la naissance
   RATÉ

✅ Penta 1                      ← ✅ VRAI NOM
   1ère dose
   6 semaines
```

#### Onglet "Faits" (4 vaccins)

```
✅ BCG                          ← ✅ VRAI NOM
✅ HepB 0                       ← ✅ VRAI NOM
✅ Penta 1                      ← ✅ VRAI NOM
✅ VPO 1                        ← ✅ VRAI NOM
```

#### Onglet "Ratés" (7 vaccins)

```
⚠️ VPO 0                        ← ✅ VRAI NOM
⚠️ Pneumo 1                     ← ✅ VRAI NOM
⚠️ Rota 1                       ← ✅ VRAI NOM
⚠️ Penta 2                      ← ✅ VRAI NOM
⚠️ VPO 2                        ← ✅ VRAI NOM
⚠️ Pneumo 2                     ← ✅ VRAI NOM
⚠️ Rota 2                       ← ✅ VRAI NOM
```

**❌ Échoue si:**
- N'importe où affiche "Vaccin inconnu"
- N'importe où affiche "Vaccin"

---

### C. Écran Calendrier

**Navigation:** Dashboard → Menu → Calendrier

**Attendu:**
```
📅 CALENDRIER VACCINAL

Novembre 2024
┌─────────────────────────────────────┐
│ 15 Nov                              │
│ ✅ BCG (fait)                       │ ← ✅ VRAI NOM
│ ✅ HepB 0 (fait)                    │ ← ✅ VRAI NOM
│ ⚠️ VPO 0 (raté)                     │ ← ✅ VRAI NOM
└─────────────────────────────────────┘

Décembre 2024
┌─────────────────────────────────────┐
│ 27 Déc                              │
│ ✅ Penta 1 (fait)                   │ ← ✅ VRAI NOM
│ ✅ VPO 1 (fait)                     │ ← ✅ VRAI NOM
│ ⚠️ Pneumo 1 (raté)                  │ ← ✅ VRAI NOM
│ ⚠️ Rota 1 (raté)                    │ ← ✅ VRAI NOM
└─────────────────────────────────────┘
```

**❌ Échoue si:**
- Timeline affiche "Vaccin inconnu"
- Aucun événement affiché

---

### D. Écran Rendez-vous

**Navigation:** Dashboard → Rendez-vous

**Attendu:**

Si aucun rendez-vous programmé:
```
📅 RENDEZ-VOUS

Aucun rendez-vous programmé
```

Si rendez-vous ajouté par agent:
```
📅 Penta 3                      ← ✅ VRAI NOM
   15 Janvier 2025 à 09:00
   Centre de Santé Mbour
   Statut: Programmé
```

**❌ Échoue si:**
- Affiche "Vaccin inconnu"
- Affiche "Rendez-vous" au lieu du nom du vaccin

---

## 🔍 4. Vérification Base de Données

### MongoDB - Voir les Vaccinations

```bash
mongosh
use vacxcare
db.vaccinations.find({ child: ObjectId("674...") }).pretty()
```

**Vérifiez:**
```javascript
// Vaccination "done"
{
  "_id": ObjectId("..."),
  "child": ObjectId("674..."),
  "vaccineName": "BCG",          // ✅ PRÉSENT
  "vaccine": null,                // Peut être null
  "dose": "1ère dose",
  "status": "done",
  "doneDate": ISODate("...")
}

// Vaccination "missed"
{
  "_id": ObjectId("..."),
  "child": ObjectId("674..."),
  "vaccineName": "VPO 0",        // ✅ PRÉSENT
  "vaccine": null,
  "dose": "À la naissance",
  "status": "missed",
  "notes": "Vaccin non fait lors de l'inscription"
}
```

**❌ Problème si:**
- `vaccineName` est vide/null
- Tous les `vaccineName` sont identiques

---

## 🧪 5. Test API Direct

### Endpoint Vaccinations

```bash
# Remplacez CHILD_ID par l'ID de l'enfant
curl http://localhost:5000/api/mobile/children/CHILD_ID/vaccinations | jq
```

**Réponse attendue:**
```json
{
  "serverTime": "2024-11-18T...",
  "vaccinations": [
    {
      "_id": "674...",
      "vaccineName": "BCG",              // ✅ PRÉSENT
      "name": "BCG",                     // ✅ PRÉSENT
      "dose": "1ère dose",
      "status": "done",
      "recommendedAge": "À la naissance"
    },
    {
      "vaccineName": "VPO 0",            // ✅ PRÉSENT
      "name": "VPO 0",                   // ✅ PRÉSENT
      "status": "missed"
    }
  ]
}
```

### Endpoint Calendrier

```bash
curl http://localhost:5000/api/mobile/children/CHILD_ID/calendar | jq
```

**Réponse attendue:**
```json
{
  "merged": [
    {
      "_id": "674...",
      "name": "BCG",                     // ✅ PRÉSENT
      "vaccineName": "BCG",              // ✅ PRÉSENT
      "date": "2024-11-18T...",
      "status": "done"
    },
    {
      "name": "VPO 0",                   // ✅ PRÉSENT
      "vaccineName": "VPO 0",            // ✅ PRÉSENT
      "status": "missed"
    }
  ]
}
```

---

## ❌ 6. Problèmes Fréquents

### Problème 1: "Vaccin inconnu" partout

**Cause:** Backend pas à jour
**Solution:**
```bash
cd vacxcare-backend
git pull  # ou vérifier les modifications
npm run dev
```

### Problème 2: Calendrier vide

**Cause:** Endpoint calendrier non accessible
**Solution:** Vérifier logs backend pour erreurs

### Problème 3: Vaccinations vides

**Cause:** Aucune vaccination en base
**Solution:** Refaire la sélection des vaccins

### Problème 4: Noms en anglais

**Cause:** Données de test en anglais
**Solution:** Vérifier le calendrier vaccinal en base

---

## 📊 7. Checklist Finale

### Backend
- [ ] Serveur démarré sur port 5000
- [ ] Calendrier vaccinal en base (> 0 documents)
- [ ] Endpoint `/vaccinations` retourne `vaccineName`
- [ ] Endpoint `/calendar` retourne `name` et `vaccineName`
- [ ] Endpoint `/appointments` retourne `vaccineName`
- [ ] Logs backend montrent les vrais noms

### Mobile
- [ ] Dashboard Activité: vrais noms ✅
- [ ] Vaccinations Tous: vrais noms ✅
- [ ] Vaccinations Faits: vrais noms ✅
- [ ] Vaccinations Ratés: vrais noms ✅
- [ ] Calendrier Timeline: vrais noms ✅
- [ ] Rendez-vous: vrais noms ✅
- [ ] Aucun "Vaccin inconnu" nulle part ✅

### Base de Données
- [ ] Toutes les vaccinations ont `vaccineName` rempli
- [ ] Statuts "done" et "missed" présents
- [ ] Dates cohérentes

---

## 🎯 8. Résultat Attendu Final

**Tous les écrans doivent afficher:**
- ✅ **BCG** au lieu de "Vaccin inconnu"
- ✅ **Penta 1** au lieu de "Vaccin inconnu"
- ✅ **VPO 0** au lieu de "Vaccin inconnu"
- ✅ **Pneumo 1** au lieu de "Vaccin inconnu"
- etc.

**Statuts corrects:**
- ✅ Vert = fait (done)
- ⚠️ Orange = raté (missed)
- 📅 Bleu = programmé (scheduled)

**Si tout est OK, vous verrez ZÉRO "Vaccin inconnu" dans toute l'application !** 🎉
