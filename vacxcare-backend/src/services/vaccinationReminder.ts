import Vaccination from "../models/Vaccination";
import Child from "../models/Child";
import Notification from "../models/Notification";
import { io } from "../server";
import { sendSocketNotification } from "../utils/socketManager";
import { sendVaccinationNotification } from "./notification";

/**
 * Service de rappels automatiques pour les vaccinations programmées
 * Envoie des notifications quotidiennes 5 jours avant le rendez-vous
 */

/**
 * Calcule le nombre de jours entre deux dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const diffTime = date2.getTime() - date1.getTime();
  return Math.ceil(diffTime / oneDay);
}

/**
 * Vérifie si une notification de rappel a déjà été envoyée aujourd'hui
 */
async function hasReminderBeenSentToday(
  childId: string,
  vaccinationId: string
): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingNotification = await Notification.findOne({
    "metadata.childId": childId,
    "metadata.vaccinationId": vaccinationId,
    "metadata.reminderType": "vaccination_reminder",
    createdAt: {
      $gte: today,
      $lt: tomorrow,
    },
  });

  return !!existingNotification;
}

/**
 * Envoie les rappels pour les vaccinations programmées dans les 5 prochains jours
 */
export async function sendVaccinationReminders(): Promise<void> {
  try {
    console.log("🔔 Démarrage du service de rappels de vaccination...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);

    // Récupérer toutes les vaccinations programmées (filtrage J à J+5 côté TS)
    const upcomingVaccinations = await Vaccination.find({
      status: "scheduled",
    })
      .populate("child", "name parentInfo")
      .populate("vaccine", "name")
      .lean();

    console.log(
      `📊 ${upcomingVaccinations.length} vaccination(s) programmée(s) dans les 5 prochains jours`
    );

    let remindersSent = 0;
    let remindersSkipped = 0;

    for (const vaccination of upcomingVaccinations) {
      const child: any = vaccination.child;
      const vaccine: any = vaccination.vaccine;

      if (!child || !child.parentInfo?.parentPhone) {
        console.log(
          `⚠️ Pas d'informations parent pour l'enfant ${child?.name || "inconnu"}`
        );
        continue;
      }

      // Vérifier si un rappel a déjà été envoyé aujourd'hui
      const alreadySent = await hasReminderBeenSentToday(
        child._id.toString(),
        vaccination._id.toString()
      );

      if (alreadySent) {
        remindersSkipped++;
        console.log(
          `⏭️ Rappel déjà envoyé aujourd'hui pour ${child.name} - ${vaccine?.name || vaccination.vaccineName}`
        );
        continue;
      }

      // Vérifier que scheduledDate existe
      if (!vaccination.scheduledDate) {
        console.log(
          `⚠️ Pas de date programmée pour ${child.name} - ${vaccine?.name || vaccination.vaccineName}`
        );
        continue;
      }

      // Calculer les jours restants
      const scheduledDate = new Date(vaccination.scheduledDate);
      scheduledDate.setHours(0, 0, 0, 0);
      const daysRemaining = daysBetween(today, scheduledDate);

      // Ignorer les vaccinations hors fenêtre J (0) à J+5
      if (daysRemaining < 0 || daysRemaining > 5) {
        console.log(
          `⏭️ Vaccination hors fenêtre J-5 pour ${child.name} - ${vaccine?.name || vaccination.vaccineName} (dans ${daysRemaining} jour(s))`
        );
        continue;
      }

      const vaccineName = vaccine?.name || vaccination.vaccineName || "Vaccin";
      const parentPhone = child.parentInfo.parentPhone;
      const parentName = child.parentInfo.parentName || "Parent";

      // Créer le message de rappel
      let message = "";
      let title = "";

      if (daysRemaining === 0) {
        title = "📅 Rendez-vous aujourd'hui !";
        message = `Bonjour ${parentName}, le rendez-vous de vaccination ${vaccineName} pour votre enfant ${child.name} est AUJOURD'HUI. N'oubliez pas de vous rendre à votre centre de santé.`;
      } else if (daysRemaining === 1) {
        title = "⏰ Rendez-vous demain !";
        message = `Bonjour ${parentName}, rappel : le rendez-vous de vaccination ${vaccineName} pour votre enfant ${child.name} est DEMAIN (${scheduledDate.toLocaleDateString("fr-FR")}). Préparez le carnet de santé de votre enfant.`;
      } else {
        title = `📅 Rendez-vous dans ${daysRemaining} jours`;
        message = `Bonjour ${parentName}, rappel : le rendez-vous de vaccination ${vaccineName} pour votre enfant ${child.name} est prévu dans ${daysRemaining} jours (${scheduledDate.toLocaleDateString("fr-FR")}). Notez bien cette date !`;
      }

      // 1. Sauvegarder la notification en base de données
      await Notification.create({
        title,
        message,
        type: "vaccination", // doit respecter l'enum du modèle Notification
        status: "info", // niveau d'information
        targetRoles: ["parent"], // cibler les parents (role "user" n'existe pas dans l'enum)
        metadata: {
          childId: child._id.toString(),
          vaccinationId: vaccination._id.toString(),
          reminderType: "vaccination_reminder",
          daysRemaining,
        },
      });

      // 2. Envoyer via Socket.io
      const rooms = [
        "parent",
        "all",
        `child_${child._id}`,
        `parent_${parentPhone}_child_${child._id}`,
      ];

      sendSocketNotification(io, rooms, {
        title,
        message,
        type: "info",
        icon: "📅",
        date: new Date().toISOString(),
      });

      // 3. Envoyer via WhatsApp + SMS
      try {
        await sendVaccinationNotification(
          parentPhone,
          parentName,
          child.name,
          vaccineName,
          scheduledDate.toLocaleDateString("fr-FR"), // Convertir en string
          "whatsapp" // Priorité WhatsApp pour économiser
        );
      } catch (error) {
        console.error(
          `❌ Erreur envoi WhatsApp/SMS pour ${child.name}:`,
          error
        );
        // Continuer même si l'envoi échoue
      }

      remindersSent++;
      console.log(
        `✅ Rappel envoyé à ${parentName} pour ${child.name} - ${vaccineName} (dans ${daysRemaining} jour(s))`
      );
    }

    console.log(
      `🎉 Rappels terminés : ${remindersSent} envoyé(s), ${remindersSkipped} déjà envoyé(s) aujourd'hui`
    );
  } catch (error) {
    console.error("❌ Erreur dans le service de rappels:", error);
  }
}
