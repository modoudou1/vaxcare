# 🧪 Tests CURL pour Stock Transfer

## 📋 Préparation

Remplacez les valeurs suivantes :
- `NATIONAL_EMAIL` : Email du compte national
- `NATIONAL_PASSWORD` : Mot de passe du compte national  
- `REGIONAL_EMAIL` : Email du compte régional Dakar (modoum469@gmail.com)
- `REGIONAL_PASSWORD` : Mot de passe du compte régional
- `STOCK_ID` : ID d'un stock national
- `QUANTITY` : Quantité à transférer

---

## 1️⃣ Connexion NATIONAL

```bash
curl -c /tmp/cookies_national.txt -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "NATIONAL_EMAIL",
    "password": "NATIONAL_PASSWORD"
  }'
```

**Regardez les logs backend** - vous devriez voir la connexion réussie.

---

## 2️⃣ Voir les stocks NATIONAUX

```bash
curl -b /tmp/cookies_national.txt "http://localhost:5000/api/stocks"
```

**Logs backend** :
```
📊 ========= GET STOCKS pour national =========
👤 User email: ...
📍 User region: ""
🔍 Requête MongoDB: { "$or": [ { "level": "national" }, ... ] }
📦 Stocks trouvés: X
```

**Copiez un `_id` de stock** pour l'utiliser dans le transfert.

---

## 3️⃣ Transférer vers DAKAR

```bash
curl -b /tmp/cookies_national.txt -X POST "http://localhost:5000/api/stocks/transfers/initiate" \
  -H "Content-Type: application/json" \
  -d '{
    "stockId": "STOCK_ID",
    "quantity": 100,
    "toRegion": "Dakar"
  }'
```

**Logs backend** - TRÈS IMPORTANT :
```
🚀 ========= DÉBUT TRANSFERT =========
👤 User: ... Role: national Region: N/A
📦 Body reçu: {"stockId":"...","quantity":100,"toRegion":"Dakar"}
🔍 toRegion value: string "Dakar"

✅ Niveau destination déterminé: regional
✅ Région destination finale: Dakar
✅ HealthCenter destination: AUCUN

🔍 Recherche stock destination avec: {"vaccine":"...","batchNumber":"...","level":"regional","region":"Dakar"}
🔍 Stock destination trouvé? NON

🔥 Création nouveau stock destination: {"vaccine":"...","level":"regional","region":"Dakar",...}
✅ Stock créé avec ID: 67xxxx...
✅ Détails complets: {
  "_id": "67xxxx...",
  "vaccine": "BCG",
  "batchNumber": "LOT-XXX",
  "quantity": 100,
  "level": "regional",
  "region": "Dakar",
  "healthCenter": null
}
```

**📸 COPIEZ-MOI CES LOGS !**

---

## 4️⃣ Vérifier stocks NATIONAL après transfert

```bash
curl -b /tmp/cookies_national.txt "http://localhost:5000/api/stocks"
```

**Question** : Le stock transféré apparaît-il toujours dans la liste du national ?
- ❌ **OUI** = PROBLÈME : Le stock ne devrait plus être là
- ✅ **NON** = CORRECT : Le stock a été transféré

**Logs backend** :
```
📊 ========= GET STOCKS pour national =========
📦 Stocks trouvés: X
```

---

## 5️⃣ Connexion REGIONAL Dakar

```bash
curl -c /tmp/cookies_regional.txt -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "modoum469@gmail.com",
    "password": "REGIONAL_PASSWORD"
  }'
```

---

## 6️⃣ Voir les stocks RÉGIONAUX Dakar

```bash
curl -b /tmp/cookies_regional.txt "http://localhost:5000/api/stocks"
```

**Logs backend - CRUCIAL** :
```
📊 ========= GET STOCKS pour regional =========
👤 User email: modoum469@gmail.com
📍 User region: "Dakar"
🏥 User healthCenter: "N/A"
🔍 Requête MongoDB: {
  "$or": [
    { "level": "regional", "region": "Dakar" },
    { "level": { "$exists": false }, "region": "Dakar", ... }
  ]
}
📦 Stocks trouvés: X

Si X = 0:
❌ AUCUN STOCK TROUVÉ - Vérifions tous les stocks régionaux dans la DB...
🔍 Tous les stocks level=regional dans la DB: Y
  1. region="Dakar" vaccine=BCG qty=100
  2. region="Thies" vaccine=POLIO qty=200
  ...
```

**📸 COPIEZ-MOI CES LOGS !**

---

## 🔍 ANALYSE

Si le régional ne voit pas le stock :

### Comparaison à faire :

Dans les logs du **transfert (étape 3)**, regardez :
```
✅ Détails complets: {
  "region": "Dakar",   <--- Valeur exacte créée
  ...
}
```

Dans les logs du **GET stocks régional (étape 6)**, regardez :
```
📍 User region: "Dakar"   <--- Valeur recherchée
🔍 Requête MongoDB: { "region": "Dakar" }
```

**Comparez EXACTEMENT** :
- Les deux valeurs sont-elles identiques ?
- Même casse (majuscules/minuscules) ?
- Mêmes espaces ?
- Mêmes caractères spéciaux ?

Si dans la liste "Tous les stocks level=regional", vous voyez :
```
1. region="Dakar" vaccine=BCG qty=100
```

Mais que le filtre ne le trouve pas, c'est qu'il y a une **différence invisible** (espace, caractère spécial, etc.)

---

## 🚀 Exécution rapide

Vous pouvez aussi utiliser le script automatique :

```bash
cd /Users/macretina/Vacxcare
./test-stock-transfer.sh
```

Il vous demandera :
- Email/password du national
- Quantité à transférer
- Email/password du régional

Et fera tous les tests automatiquement !

---

## 📊 Résultat attendu

**✅ SUCCÈS** :
- National : Voit ses stocks SAUF celui transféré
- Regional : Voit le stock transféré avec `level: "regional"` et `region: "Dakar"`

**❌ PROBLÈME ACTUEL** :
- National : Voit TOUS ses stocks Y COMPRIS celui transféré
- Regional : Ne voit AUCUN stock

**Solution** : Les logs nous diront pourquoi !
