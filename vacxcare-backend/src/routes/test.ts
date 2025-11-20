import { Router } from "express";
import { sendInvitationEmail } from "../utils/mailer";
import { sendVaccinationReminders } from "../services/vaccinationReminder";

const router = Router();

// Test email
router.get("/email", async (req, res) => {
  try {
    await sendInvitationEmail(
      "tonemailperso@gmail.com", // remplace par ton adresse réelle pour tester
      "123456", // token fake pour test
      "regional",
      "Dakar"
    );
    res.json({ message: "✅ Email envoyé avec succès" });
  } catch (err: any) {
    console.error("❌ Erreur test email:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Test rappels de vaccination
router.get("/vaccination-reminders", async (req, res) => {
  try {
    console.log("🧪 Test manuel des rappels de vaccination...");
    await sendVaccinationReminders();
    res.json({ 
      success: true,
      message: "✅ Rappels de vaccination envoyés avec succès ! Vérifiez les logs du serveur et les notifications mobiles."
    });
  } catch (err: any) {
    console.error("❌ Erreur test rappels:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
