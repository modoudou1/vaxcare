import { Router } from "express";
import { sendInvitationEmail } from "../utils/mailer";

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

export default router;
