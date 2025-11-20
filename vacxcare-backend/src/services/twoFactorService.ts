import User from "../models/User";
import SystemSettings from "../models/SystemSettings";
import { sendTwoFactorCode as sendEmailTwoFactorCode } from "../utils/mailer";
import { sendSMS } from "./sms";

/**
 * Génère et envoie un code 2FA pour un utilisateur par email (par défaut) ou SMS si activé.
 * Retourne le code (utile pour tests ou MOCK), mais en prod évitez de l'exposer côté API.
 */
export const sendTwoFactorCode = async (email: string): Promise<string> => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("Utilisateur introuvable");
  }

  // Détermine la méthode d'envoi: par défaut email
  let method: "email" | "sms" = "email";
  try {
    const settings = await SystemSettings.findOne();
    const channels = (settings as any)?.notificationChannels || { auth: ["email"] };
    if (channels.auth?.includes("sms") && user.phone) {
      method = "sms";
    }
  } catch {
    // si pas de settings, garde email
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  user.twoFactorEnabled = true;
  user.twoFactorMethod = method;
  user.twoFactorCode = code;
  user.twoFactorExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  await user.save();

  if (method === "sms" && user.phone) {
    await sendSMS(user.phone, `Votre code de vérification est: ${code}`);
  } else {
    await sendEmailTwoFactorCode(user.email, code);
  }

  return code;
};

/**
 * Vérifie un code 2FA pour un utilisateur. Retourne true si valide, sinon false.
 */
export const verifyTwoFactorCode = async (
  email: string,
  code: string
): Promise<boolean> => {
  const user = await User.findOne({ email });
  if (!user) return false;

  if (!user.twoFactorCode || !user.twoFactorExpires) return false;
  if (user.twoFactorExpires < new Date()) return false;
  if (user.twoFactorCode !== code) return false;

  user.twoFactorCode = null;
  user.twoFactorExpires = null;
  await user.save();

  return true;
};
