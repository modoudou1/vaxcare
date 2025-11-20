import cron from "node-cron";
import { sendVaccinationReminders } from "../services/vaccinationReminder";

/**
 * CRON job pour envoyer les rappels de vaccination quotidiennement
 * S'exécute tous les jours à 9h00 du matin
 */
export function startVaccinationRemindersCron() {
  // Planifier l'exécution tous les jours à 9h00
  // Format: minute heure jour mois jour_de_la_semaine
  // "0 9 * * *" = Tous les jours à 9h00
  cron.schedule("0 9 * * *", async () => {
    console.log("⏰ CRON: Exécution du service de rappels de vaccination...");
    await sendVaccinationReminders();
  });

  console.log(
    "✅ CRON des rappels de vaccination configuré (exécution quotidienne à 9h00)"
  );
}
