import twilio from "twilio";

// Configuration Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886"; // Numéro sandbox Twilio par défaut

let twilioClient: any = null;

// Initialiser le client Twilio si les credentials sont présents
if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
  console.log("✅ Client Twilio WhatsApp initialisé");
} else {
  console.warn("⚠️ Twilio credentials manquants - WhatsApp désactivé");
}

/**
 * 📱 Envoyer un message WhatsApp
 * @param to - Numéro de téléphone du destinataire (format: +221XXXXXXXXX)
 * @param message - Contenu du message
 * @returns Promise avec le résultat de l'envoi
 */
export async function sendWhatsApp(to: string, message: string): Promise<any> {
  if (!twilioClient) {
    console.warn("⚠️ WhatsApp non configuré - message non envoyé");
    return {
      success: false,
      error: "WhatsApp non configuré",
      simulated: true,
    };
  }

  try {
    // Normaliser le numéro de téléphone
    let phone = to.trim();
    
    // Ajouter le préfixe WhatsApp si absent
    if (!phone.startsWith("whatsapp:")) {
      // S'assurer que le numéro a le format international
      if (!phone.startsWith("+")) {
        // Si c'est un numéro sénégalais sans +
        if (phone.startsWith("221")) {
          phone = `+${phone}`;
        } else if (phone.startsWith("0")) {
          // 0XXXXXXXXX → +221XXXXXXXXX
          phone = `+221${phone.slice(1)}`;
        } else if (phone.length === 9) {
          // XXXXXXXXX → +221XXXXXXXXX
          phone = `+221${phone}`;
        } else {
          phone = `+${phone}`;
        }
      }
      phone = `whatsapp:${phone}`;
    }

    console.log(`📱 Envoi WhatsApp à ${phone}...`);

    const result = await twilioClient.messages.create({
      from: whatsappFrom,
      to: phone,
      body: message,
    });

    console.log(`✅ WhatsApp envoyé avec succès - SID: ${result.sid}`);
    
    return {
      success: true,
      sid: result.sid,
      status: result.status,
      to: phone,
    };
  } catch (error: any) {
    console.error("❌ Erreur envoi WhatsApp:", error.message);
    
    // Retourner les détails de l'erreur pour le debugging
    return {
      success: false,
      error: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
    };
  }
}

/**
 * 📱 Envoyer un message avec médias (image, PDF, etc.)
 * @param to - Numéro de téléphone du destinataire
 * @param message - Contenu du message
 * @param mediaUrl - URL du média à joindre
 * @returns Promise avec le résultat de l'envoi
 */
export async function sendWhatsAppWithMedia(
  to: string,
  message: string,
  mediaUrl: string
): Promise<any> {
  if (!twilioClient) {
    console.warn("⚠️ WhatsApp non configuré - message non envoyé");
    return {
      success: false,
      error: "WhatsApp non configuré",
      simulated: true,
    };
  }

  try {
    // Normaliser le numéro
    let phone = to.trim();
    if (!phone.startsWith("whatsapp:")) {
      if (!phone.startsWith("+")) {
        if (phone.startsWith("221")) {
          phone = `+${phone}`;
        } else if (phone.startsWith("0")) {
          phone = `+221${phone.slice(1)}`;
        } else if (phone.length === 9) {
          phone = `+221${phone}`;
        } else {
          phone = `+${phone}`;
        }
      }
      phone = `whatsapp:${phone}`;
    }

    console.log(`📱 Envoi WhatsApp avec média à ${phone}...`);

    const result = await twilioClient.messages.create({
      from: whatsappFrom,
      to: phone,
      body: message,
      mediaUrl: [mediaUrl],
    });

    console.log(`✅ WhatsApp avec média envoyé - SID: ${result.sid}`);
    
    return {
      success: true,
      sid: result.sid,
      status: result.status,
      to: phone,
    };
  } catch (error: any) {
    console.error("❌ Erreur envoi WhatsApp avec média:", error.message);
    
    return {
      success: false,
      error: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
    };
  }
}

/**
 * 🔔 Envoyer une notification de rappel de vaccination
 * @param to - Numéro de téléphone
 * @param parentName - Nom du parent
 * @param childName - Nom de l'enfant
 * @param vaccineName - Nom du vaccin
 * @param appointmentDate - Date du rendez-vous
 */
export async function sendVaccinationReminder(
  to: string,
  parentName: string,
  childName: string,
  vaccineName: string,
  appointmentDate: string
): Promise<any> {
  const message = `👋 Bonjour ${parentName},

📅 Rappel de vaccination pour ${childName}

💉 Vaccin : ${vaccineName}
🗓️ Date : ${appointmentDate}

N'oubliez pas d'apporter le carnet de vaccination !

📱 VaxCare - Votre carnet de vaccination digital`;

  return sendWhatsApp(to, message);
}

/**
 * 🆕 Envoyer le code d'accès au nouveau parent
 * @param to - Numéro de téléphone
 * @param parentName - Nom du parent
 * @param childName - Nom de l'enfant
 * @param accessCode - Code d'accès à 6 chiffres
 */
export async function sendAccessCodeWhatsApp(
  to: string,
  parentName: string,
  childName: string,
  accessCode: string
): Promise<any> {
  const message = `👶 *Bienvenue sur VaxCare !*

Bonjour ${parentName}, votre enfant *${childName}* a été enregistré avec succès.

🔐 *Code d'accès :* ${accessCode}

📱 Pour accéder au carnet de vaccination digital :
1. Téléchargez l'application VaxCare
2. Entrez votre numéro de téléphone
3. Saisissez le code d'accès ci-dessus

✅ Vous pourrez suivre les vaccinations, recevoir des rappels et consulter l'historique de santé de votre enfant.

💬 Besoin d'aide ? Répondez à ce message.

_VaxCare - Protéger la santé de nos enfants_`;

  return sendWhatsApp(to, message);
}

export default {
  sendWhatsApp,
  sendWhatsAppWithMedia,
  sendVaccinationReminder,
  sendAccessCodeWhatsApp,
};
