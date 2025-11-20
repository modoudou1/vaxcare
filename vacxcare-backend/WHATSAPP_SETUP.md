# 📱 Configuration WhatsApp avec Twilio (GRATUIT)

## 🎁 Offre gratuite Twilio
- **1000 messages WhatsApp GRATUITS par mois**
- Pas de carte bancaire nécessaire pour commencer
- Idéal pour tester et démarrer VaxCare

## 📝 Étapes de configuration

### 1️⃣ Créer un compte Twilio (5 minutes)

1. Allez sur https://www.twilio.com/try-twilio
2. Cliquez sur "Sign up"
3. Remplissez le formulaire :
   - Email
   - Mot de passe
   - Prénom/Nom
4. Vérifiez votre email
5. Vérifiez votre numéro de téléphone

### 2️⃣ Récupérer vos credentials (2 minutes)

1. Connectez-vous à la Console Twilio
2. Dans le **Dashboard**, vous verrez :
   - **Account SID** : commence par `AC...`
   - **Auth Token** : cliquez sur "Show" pour le voir
3. Copiez ces deux valeurs

### 3️⃣ Activer WhatsApp Sandbox (3 minutes)

1. Dans la Console Twilio, allez dans :
   ```
   Messaging > Try it out > Send a WhatsApp message
   ```
2. Vous verrez un numéro WhatsApp Twilio (ex: `+1 415 523 8886`)
3. **IMPORTANT** : Envoyez un message WhatsApp depuis votre téléphone à ce numéro :
   ```
   join <code-unique>
   ```
   (Le code unique vous sera donné sur la page)
4. Vous recevrez une confirmation : "You are now connected to the sandbox"

### 4️⃣ Configurer VaxCare

Ouvrez le fichier `.env` et modifiez :

```env
# ☁️ Twilio (SMS + WhatsApp)
TWILIO_ACCOUNT_SID=AC1234567890abcdef...    # Votre Account SID
TWILIO_AUTH_TOKEN=1234567890abcdef...        # Votre Auth Token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   # Le numéro sandbox Twilio

# Désactiver le mode simulation
MOCK_SMS=false
```

### 5️⃣ Redémarrer le serveur

```bash
cd vacxcare-backend
npm run dev
```

## 🧪 Tester l'envoi

### Option 1 : Créer un nouvel enfant depuis l'interface agent
1. Connectez-vous en tant qu'agent
2. Ajoutez un enfant avec votre numéro de téléphone
3. Vous recevrez le code d'accès par WhatsApp + SMS !

### Option 2 : Test manuel via la console Node.js

```javascript
// Dans le terminal backend
node
> const { sendAccessCodeWhatsApp } = require('./dist/services/whatsapp');
> sendAccessCodeWhatsApp('+221771112222', 'Fatou', 'Amadou', '123456');
```

## 📊 Limites du compte gratuit

| Feature | Limite gratuite |
|---------|----------------|
| WhatsApp messages | 1000/mois |
| SMS | 500 messages |
| Numéros testés | Jusqu'à 5 numéros vérifiés |
| Durée | Illimitée |

## 🚀 Passer en Production

Quand vous serez prêt (après les tests) :

### 1. Valider votre compte Twilio
- Ajouter une carte bancaire (pas de débit immédiat)
- Vérifier votre entreprise

### 2. Demander un numéro WhatsApp Business officiel
1. Console Twilio > Messaging > Senders > WhatsApp senders
2. Request WhatsApp Business Profile
3. Fournir :
   - Nom de l'entreprise (VaxCare)
   - Description
   - Logo
   - Catégorie (Healthcare)

**Délai d'approbation** : 1-3 jours ouvrables

### 3. Mettre à jour .env
```env
TWILIO_WHATSAPP_FROM=whatsapp:+221XXXXXXXXX  # Votre numéro officiel
```

## 💰 Tarifs Production (quand vous dépassez 1000 messages/mois)

| Canal | Prix Sénégal |
|-------|--------------|
| WhatsApp | ~5 FCFA/message |
| SMS | ~25 FCFA/message |

## 🎯 Stratégie recommandée

Pour économiser en production :

1. **Messages critiques** (code d'accès, urgences) → WhatsApp + SMS
2. **Rappels quotidiens** → WhatsApp uniquement
3. **Notifications** → WhatsApp uniquement

**Économie estimée** : 70% par rapport au SMS seul !

## ❓ Problèmes fréquents

### "WhatsApp non configuré"
➡️ Vérifiez que `TWILIO_ACCOUNT_SID` et `TWILIO_AUTH_TOKEN` sont bien définis dans `.env`

### "Failed to send message"
➡️ Vérifiez que vous avez bien envoyé `join <code>` au sandbox Twilio depuis WhatsApp

### "Number not in sandbox"
➡️ Chaque numéro de téléphone de test doit envoyer `join <code>` au sandbox Twilio avant de pouvoir recevoir des messages

### Message non reçu
➡️ Vérifiez les logs du serveur pour voir si le message a été envoyé
➡️ Vérifiez les logs Twilio : Console > Monitor > Logs > Messaging

## 📞 Support

- Documentation Twilio WhatsApp : https://www.twilio.com/docs/whatsapp
- Support Twilio : https://support.twilio.com
- VaxCare : contact@vaxcare.sn

---

✅ **Une fois configuré, vos parents recevront automatiquement les codes d'accès et rappels par WhatsApp !**
