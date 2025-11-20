import { sendSMS } from "./sms";
import { sendWhatsApp, sendAccessCodeWhatsApp, sendVaccinationReminder } from "./whatsapp";

/**
 * 📨 Service de notification unifié
 * Envoie les messages par WhatsApp en priorité, avec fallback SMS
 */

export type NotificationChannel = "whatsapp" | "sms" | "both";

interface SendNotificationOptions {
  to: string;
  message: string;
  channel?: NotificationChannel;
  priority?: "high" | "normal";
}

/**
 * 📱 Envoyer une notification intelligente
 * @param options - Options d'envoi
 * @returns Résultat de l'envoi
 */
export async function sendNotification(options: SendNotificationOptions) {
  const { to, message, channel = "both", priority = "normal" } = options;
  
  const results: any = {
    whatsapp: null,
    sms: null,
    success: false,
  };

  try {
    // Stratégie d'envoi selon le canal et la priorité
    if (channel === "whatsapp" || channel === "both") {
      console.log("📱 Tentative d'envoi WhatsApp...");
      const whatsappResult = await sendWhatsApp(to, message);
      results.whatsapp = whatsappResult;
      
      if (whatsappResult.success) {
        results.success = true;
        console.log("✅ Message envoyé par WhatsApp");
        
        // Si WhatsApp réussit et que ce n'est pas une priorité haute, on s'arrête là
        if (channel === "whatsapp" || priority === "normal") {
          return results;
        }
      } else {
        console.log("⚠️ WhatsApp échoué, fallback vers SMS...");
      }
    }

    // Envoyer par SMS si :
    // - Le canal demandé est SMS
    // - Le canal est "both" 
    // - WhatsApp a échoué
    // - C'est une priorité haute
    if (
      channel === "sms" || 
      channel === "both" || 
      !results.whatsapp?.success ||
      priority === "high"
    ) {
      console.log("📧 Envoi SMS...");
      const smsResult = await sendSMS(to, message);
      results.sms = smsResult;
      
      if (smsResult) {
        results.success = true;
        console.log("✅ Message envoyé par SMS");
      }
    }

    return results;
  } catch (error: any) {
    console.error("❌ Erreur envoi notification:", error.message);
    return {
      ...results,
      error: error.message,
    };
  }
}

/**
 * 🆕 Envoyer le code d'accès à un nouveau parent
 */
export async function sendParentAccessCode(
  to: string,
  parentName: string,
  childName: string,
  accessCode: string,
  channel: NotificationChannel = "both"
) {
  console.log(`📬 Envoi code d'accès à ${parentName} (${to})...`);
  
  const results: any = {
    whatsapp: null,
    sms: null,
    success: false,
  };

  // Message pour SMS (plus court)
  const smsMessage = `👶 Bonjour ${parentName}, votre enfant ${childName} a été enregistré sur VaxCare.

🔐 Code d'accès: ${accessCode}

Utilisez ce code avec votre numéro de téléphone pour accéder au carnet de vaccination sur l'application mobile.`;

  try {
    // Essayer WhatsApp d'abord (message plus riche)
    if (channel === "whatsapp" || channel === "both") {
      const whatsappResult = await sendAccessCodeWhatsApp(
        to,
        parentName,
        childName,
        accessCode
      );
      results.whatsapp = whatsappResult;
      
      if (whatsappResult.success) {
        results.success = true;
        console.log("✅ Code d'accès envoyé par WhatsApp");
        
        // Si on veut uniquement WhatsApp, on s'arrête
        if (channel === "whatsapp") {
          return results;
        }
      }
    }

    // Envoyer aussi par SMS pour garantir la réception
    if (channel === "sms" || channel === "both" || !results.whatsapp?.success) {
      const smsResult = await sendSMS(to, smsMessage);
      results.sms = smsResult;
      
      if (smsResult) {
        results.success = true;
        console.log("✅ Code d'accès envoyé par SMS");
      }
    }

    return results;
  } catch (error: any) {
    console.error("❌ Erreur envoi code d'accès:", error.message);
    return {
      ...results,
      error: error.message,
    };
  }
}

/**
 * 💉 Envoyer un rappel de vaccination
 */
export async function sendVaccinationNotification(
  to: string,
  parentName: string,
  childName: string,
  vaccineName: string,
  appointmentDate: string,
  channel: NotificationChannel = "both"
) {
  console.log(`💉 Envoi rappel vaccination à ${parentName}...`);
  
  const results: any = {
    whatsapp: null,
    sms: null,
    success: false,
  };

  // Message SMS (court)
  const smsMessage = `👋 Bonjour ${parentName},

📅 Rappel: Vaccination de ${childName}
💉 ${vaccineName}
🗓️ ${appointmentDate}

N'oubliez pas le carnet !

VaxCare`;

  try {
    // WhatsApp (message plus détaillé)
    if (channel === "whatsapp" || channel === "both") {
      const whatsappResult = await sendVaccinationReminder(
        to,
        parentName,
        childName,
        vaccineName,
        appointmentDate
      );
      results.whatsapp = whatsappResult;
      
      if (whatsappResult.success) {
        results.success = true;
        console.log("✅ Rappel envoyé par WhatsApp");
        
        if (channel === "whatsapp") {
          return results;
        }
      }
    }

    // SMS fallback ou complémentaire
    if (channel === "sms" || channel === "both" || !results.whatsapp?.success) {
      const smsResult = await sendSMS(to, smsMessage);
      results.sms = smsResult;
      
      if (smsResult) {
        results.success = true;
        console.log("✅ Rappel envoyé par SMS");
      }
    }

    return results;
  } catch (error: any) {
    console.error("❌ Erreur envoi rappel:", error.message);
    return {
      ...results,
      error: error.message,
    };
  }
}

export default {
  sendNotification,
  sendParentAccessCode,
  sendVaccinationNotification,
};
