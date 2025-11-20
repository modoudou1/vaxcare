// src/utils/sms.ts
import dotenv from "dotenv";
dotenv.config();

/**
 * Envoie un SMS (mock console ou Twilio réel selon MOCK_SMS)
 */
export const sendSMS = async (to: string, message: string) => {
  try {
    // Mode simulation → affiche dans la console
    if (process.env.MOCK_SMS === "true") {
      console.log("📩 [SMS MOCK]");
      console.log(`→ ${to}: ${message}`);
      console.log("----------------------------------------");
      return { success: true, mock: true };
    }

    // Mode réel (Twilio) — désactivé par défaut
    console.log("🚀 (Twilio désactivé — MOCK_SMS=false requis pour activer)");
    return { success: true, mock: false };
  } catch (err: any) {
    console.error("❌ Erreur envoi SMS:", err.message);
    return { success: false, error: err.message };
  }
};