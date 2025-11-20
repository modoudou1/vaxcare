import cron from "node-cron";
import Stock from "../models/Stock";
import Notification from "../models/Notification";
import { io } from "../server";
import { sendSocketNotification } from "../utils/socketManager";

/**
 * 🔁 CRON – Vérifie chaque jour les stocks critiques et expirations
 * ⏰ Programmation : tous les jours à 8h du matin
 */
export const startStockAlertsCron = () => {
  console.log("🕐 CRON des alertes de stock initialisé (toutes les 24h à 8h)");

  cron.schedule("0 8 * * *", async () => {
    console.log("🚀 [CRON] Vérification automatique des alertes stock…");

    try {
      const stocks = await Stock.find({});
      const now = new Date();

      for (const stock of stocks) {
        const daysLeft =
          (new Date(stock.expirationDate).getTime() - now.getTime()) /
          (1000 * 3600 * 24);

        let type: "low" | "expiring" | "expired" | null = null;

        if (stock.quantity < 10) {
          type = "low";
        } else if (daysLeft <= 30 && daysLeft > 0) {
          type = "expiring";
        } else if (daysLeft <= 0) {
          type = "expired";
        }

        if (!type) continue; // rien à signaler

        const titleMap: Record<string, string> = {
          low: `⚠️ Stock critique – ${stock.vaccine}`,
          expiring: `⏰ Expiration proche – ${stock.vaccine}`,
          expired: `❌ Stock expiré – ${stock.vaccine}`,
        };

        const messageMap: Record<string, string> = {
          low: `Le stock du vaccin ${stock.vaccine} est critique (${stock.quantity} doses restantes).`,
          expiring: `Le lot ${stock.batchNumber} de ${stock.vaccine} expire bientôt (dans moins de 30 jours).`,
          expired: `Le lot ${stock.batchNumber} de ${stock.vaccine} est arrivé à expiration.`,
        };

        const statusMap: Record<string, string> = {
          low: "warning",
          expiring: "warning",
          expired: "danger",
        };

        // Vérifie si la même alerte a déjà été envoyée dans les 24h
        const recentNotif = await Notification.findOne({
          title: titleMap[type],
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });

        if (recentNotif) {
          console.log(`⏳ [CRON] Alerte "${titleMap[type]}" déjà envoyée récemment.`);
          continue;
        }

        const notif = await Notification.create({
          title: titleMap[type],
          message: messageMap[type],
          type: "stock",
          targetRoles: ["agent", "regional"],
          status: statusMap[type],
          icon:
            type === "low"
              ? "⚠️"
              : type === "expiring"
              ? "⏰"
              : "❌",
        });

        sendSocketNotification(io, ["agent", "regional"], notif);
        console.log(`📡 [CRON] Notification envoyée → ${titleMap[type]}`);
      }

      console.log("✅ [CRON] Vérification des stocks terminée !");
    } catch (err: any) {
      console.error("❌ [CRON] Erreur lors du traitement des alertes :", err.message);
    }
  });
};