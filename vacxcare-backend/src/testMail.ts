import { Router } from "express";
import { sendInvitationEmail } from "./utils/mailer";

const router = Router();

router.get("/email", async (req, res) => {
  try {
    await sendInvitationEmail(
      "tonemailperso@gmail.com",
      "123456",
      "regional",
      "Dakar"
    );
    res.json({ message: "✅ Email envoyé" });
  } catch (err: any) {
    console.error("❌ Erreur test email:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
