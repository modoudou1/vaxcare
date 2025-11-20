# 🧪 Test Transfert Frontend vs Script Bash

## 🔍 Problème identifié

**Script bash** : ✅ Fonctionne - Le régional voit le stock
**Frontend national** : ❌ Ne fonctionne pas - Le régional ne voit pas le stock

## 💡 Cause du problème

Le modal de transfert du national chargeait les régions depuis `/api/healthcenters` en cherchant le champ `center.region`, mais :
- ❌ Certains healthcenters n'ont pas de champ `region`
- ❌ Le nom de la région peut être différent (ex: "dakar" vs "Dakar")
- ❌ Cela causait une liste de régions vide ou incorrecte

## ✅ Solution appliquée

Le modal charge maintenant les régions depuis **les utilisateurs régionaux** (`/api/users?role=regional`), ce qui garantit :
- ✅ Les régions sont exactement celles dans la base de données
- ✅ Le nom est identique à celui du user régional (ex: "Dakar")
- ✅ Fallback sur les 14 régions du Sénégal si aucun user trouvé

## 🚀 Test Frontend

### 1. Ouvrir le frontend

```bash
cd /Users/macretina/Vacxcare/vacxcare-frontend
npm run dev
```

### 2. Se connecter en tant que NATIONAL

- Email : `national@test.com`
- Mot de passe : votre mot de passe

### 3. Ouvrir la console du navigateur (F12)

**Onglet Console** - Vous allez voir les logs détaillés !

### 4. Aller dans Stocks & Lots

### 5. Cliquer sur "Transférer" sur un stock

**Regardez la console**, vous devriez voir :

```
👥 [TRANSFER MODAL] Utilisateurs régionaux reçus: X
📍 [TRANSFER MODAL] Région trouvée: "Dakar"
📍 [TRANSFER MODAL] Région trouvée: "Thiès"
📍 [TRANSFER MODAL] Régions finales: ["Dakar", "Thiès", ...]
```

### 6. Sélectionner "Dakar" dans le dropdown

**Vérifiez** que "Dakar" apparaît bien dans la liste !

### 7. Entrer une quantité (ex: 50)

### 8. Cliquer sur "Transférer"

**Regardez la console**, vous devriez voir :

```
🚀 [TRANSFER MODAL] Envoi du transfert:
   Stock ID: 691a6ed75067ff536b234211
   Quantité: 50
   toRegion: "Dakar"
   Type de toRegion: string
```

**Regardez AUSSI la console BACKEND**, vous devriez voir :

```
🚀 ========= DÉBUT TRANSFERT =========
👤 User: national@test.com Role: national Region: N/A
📦 Body reçu: {"stockId":"...","quantity":50,"toRegion":"Dakar"}
🔍 toRegion value: string "Dakar"

✅ Niveau destination déterminé: regional
✅ Région destination finale: Dakar
✅ HealthCenter destination: AUCUN

🔥 Création nouveau stock destination: {...}
✅ Stock créé avec ID: ...
✅ Détails complets: {
  "level": "regional",
  "region": "Dakar",
  ...
}
```

### 9. Se connecter en tant que RÉGIONAL

- **Déconnectez-vous**
- Email : `modoum469@gmail.com`
- Mot de passe : votre mot de passe

### 10. Aller dans Stocks & Lots

**Vous devriez voir le stock transféré ! ✨**

**Regardez la console**, vous devriez voir :

```
🔍 [REGIONAL] Chargement des stocks...
🔍 [REGIONAL] User: modoum469@gmail.com Region: Dakar
🔍 [REGIONAL] Response status: 200
🔍 [REGIONAL] Stocks reçus: 1 stocks (ou plus)
```

---

## 📊 Comparaison

| Méthode | Région envoyée | Résultat |
|---------|----------------|----------|
| **Script bash** | `"Dakar"` (hardcodé) | ✅ Fonctionne |
| **Frontend (AVANT)** | Extrait de healthcenters | ❌ Ne fonctionne pas |
| **Frontend (APRÈS)** | Extrait de users régionaux | ✅ Devrait fonctionner |

---

## 🐛 Si ça ne marche toujours pas

### Vérifiez dans les logs frontend :

1. **La liste des régions chargées** :
   ```
   📍 [TRANSFER MODAL] Régions finales: [...]
   ```
   - Est-ce que "Dakar" est dans la liste ?
   - Exactement "Dakar" avec un D majuscule ?

2. **La valeur envoyée au transfert** :
   ```
   toRegion: "Dakar"
   ```
   - Est-ce exactement "Dakar" ?
   - Pas d'espaces avant/après ?

3. **La réponse du backend** :
   - Le backend a-t-il créé le stock ?
   - Avec `level: "regional"` et `region: "Dakar"` ?

### Vérifiez dans les logs backend :

1. **La création du stock** :
   ```
   ✅ Détails complets: {
     "region": "Dakar",   <--- Vérifier cette valeur
     ...
   }
   ```

2. **Le filtre du régional** :
   ```
   📊 ========= GET STOCKS pour regional =========
   📍 User region: "Dakar"   <--- Comparer avec la valeur ci-dessus
   ```

Si les deux valeurs sont identiques mais le régional ne voit pas le stock, il y a un autre problème.

---

## ✅ Checklist de test

- [ ] Frontend national : Connexion OK
- [ ] Frontend national : Modal de transfert s'ouvre
- [ ] Console : Régions chargées avec succès
- [ ] Console : "Dakar" apparaît dans les régions
- [ ] Dropdown : "Dakar" sélectionnable
- [ ] Console : `toRegion: "Dakar"` affiché au transfert
- [ ] Backend : Stock créé avec `region: "Dakar"`
- [ ] Frontend régional : Connexion OK
- [ ] Frontend régional : Stock visible dans la liste ! ✨

---

## 🚀 Prochaine étape

Si tout fonctionne, on pourra :
1. Retirer les logs de debug
2. Tester le transfert Régional → District
3. Créer l'historique des transferts
