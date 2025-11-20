import dotenv from "dotenv";
import { sendInvitationEmail } from "./utils/mailer";

dotenv.config();

const run = async () => {
  try {
    const email = "exemple.regional@gmail.com"; // 📩 adresse de test
    const token = "fakeToken123"; // 🔑 on simule un token
    const role = "regional"; // 🏛️ rôle du compte
    const region = "Dakar";

    await sendInvitationEmail(email, token, role, region);

    console.log("✅ Email d’invitation envoyé avec succès !");
  } catch (err) {
    console.error("❌ Erreur testSend :", err);
  }
};

run();
