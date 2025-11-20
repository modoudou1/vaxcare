import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";

import Appointment from "../models/Appointment";
import Child from "../models/Child";
import Notification from "../models/Notification";
import Stock from "../models/Stock";
import User from "../models/User";
import Vaccination from "../models/Vaccination";
import Vaccine from "../models/Vaccine";
import { io } from "../server";
import { sendSocketNotification } from "../utils/socketManager";


type AuthUser = {
  _id: mongoose.Types.ObjectId | string;
  id: string;
  role: "agent" | "regional" | "national";
  email: string;
  region?: string;
  healthCenter?: string;
};

// Étendre l'interface Request pour inclure la propriété user
interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/* -------------------------------------------------------------------------- */
/* 🔎 Fonction utilitaire : résolution du vaccin (nom + ID)                  */
/* -------------------------------------------------------------------------- */
async function resolveVaccine(
  vaccine: any
): Promise<{ id: Types.ObjectId; name: string }> {
  if (!vaccine) throw new Error("Vaccin manquant");

  // Objet complet { _id, name }
  if (typeof vaccine === "object" && vaccine._id && vaccine.name) {
    return {
      id: new mongoose.Types.ObjectId(vaccine._id as string),
      name: vaccine.name,
    };
  }

  // ID MongoDB
  if (mongoose.Types.ObjectId.isValid(vaccine)) {
    const found = await Vaccine.findById(vaccine);
    if (!found) throw new Error(`Vaccin introuvable pour ID ${vaccine}`);
    return { id: found._id as Types.ObjectId, name: found.name };
  }

  // Nom (string): on tente de le trouver, sinon on le crée automatiquement
  const vaccineName = String(vaccine).trim();
  let byName = await Vaccine.findOne({ name: vaccineName });
  if (!byName) {
    byName = await Vaccine.create({ name: vaccineName });
  }
  return { id: byName._id as Types.ObjectId, name: byName.name };
}

/* -------------------------------------------------------------------------- */
/* 🔧 Fonctions utilitaires téléphone et parent                              */
/* -------------------------------------------------------------------------- */
function onlyDigits(s?: string | null): string | null {
  if (!s) return null;
  return s.replace(/\D+/g, "");
}

function normalizePhone(phone?: string | null): string | null {
  const d = onlyDigits(phone);
  return d && d.length > 0 ? d : null;
}

function buildPhoneVariants(raw?: string | null): string[] {
  const variants = new Set<string>();
  const d = normalizePhone(raw);
  if (!d) return [];

  variants.add(d);

  if (d.startsWith("221")) {
    const nat = d.slice(3);
    if (nat) {
      variants.add(nat);
      variants.add("0" + nat);
      variants.add("+221" + nat);
      variants.add("00221" + nat);
      variants.add("221" + nat);
    }
  } else {
    variants.add("221" + d);
    variants.add("+221" + d);
    variants.add("00221" + d);
    if (!d.startsWith("0")) variants.add("0" + d);
  }

  return Array.from(variants);
}

async function findParentUserIdByPhone(
  phone?: string | null,
  childId?: string
): Promise<Types.ObjectId | null> {
  const candidates = buildPhoneVariants(phone);
  if (candidates.length === 0) return null;

  // Si on a un childId, chercher spécifiquement le parent de cet enfant
  if (childId) {
    // D'abord chercher dans les liens parent-enfant
    const parentLink = await User.findOne({
      $and: [
        {
          $or: [
            { phone: { $in: candidates } },
            { phoneNumber: { $in: candidates } },
            { telephone: { $in: candidates } },
          ],
        },
        {
          $or: [
            { linkedChildren: childId },
            { children: childId },
          ],
        },
      ],
    })
      .select("_id phone phoneNumber telephone")
      .lean();

    if (parentLink) {
      console.log(`🎯 Parent spécifique trouvé pour enfant ${childId}: ${parentLink._id}`);
      return parentLink._id;
    }
  }

  // Fallback : chercher n'importe quel utilisateur avec ce téléphone
  const user = await User.findOne({
    $or: [
      { phone: { $in: candidates } },
      { phoneNumber: { $in: candidates } },
      { telephone: { $in: candidates } },
    ],
  })
    .select("_id phone phoneNumber telephone")
    .lean();

  if (user && childId) {
    console.log(`⚠️ Parent générique trouvé (pas spécifique à l'enfant ${childId}): ${user._id}`);
  }

  return user?._id ?? null;
}

async function resolveParentTargets(childDoc: any): Promise<{
  childId: string;
  parentPhone: string;
  targetRooms: string[];
  parentUserIds: Types.ObjectId[];
}> {
  const childId = childDoc._id.toString();
  const rawPhone = childDoc.parentPhone ?? childDoc.parentInfo?.parentPhone ?? "";
  const parentPhone = normalizePhone(rawPhone) ?? (rawPhone || "");

  // Les rooms Socket.io sont spécifiques à cet enfant ET ce téléphone
  const targetRooms = [
    `child_${childId}`,
    ...(parentPhone ? [`parent_${parentPhone}_child_${childId}`] : []),
  ];

  // Pour les notifications en base de données, on utilise une approche différente
  // Les parents mobiles n'ont pas d'ID User, ils s'authentifient avec l'ID enfant
  // Donc on sauvegarde avec metadata.childId et on filtre côté API
  
  console.log(`🎯 NOTIFICATION CIBLÉE PAR ROOMS SOCKET.IO:`);
  console.log(`  - Enfant: ${childDoc.name} (ID: ${childId})`);
  console.log(`  - Téléphone parent: ${parentPhone}`);
  console.log(`  - Rooms spécifiques: [${targetRooms.join(', ')}]`);
  console.log(`  - ✅ Seuls les clients connectés à ces rooms recevront la notification`);
  console.log(`  - 🔍 DEBUG: childDoc complet:`, {
    _id: childDoc._id,
    name: childDoc.name,
    firstName: childDoc.firstName,
    lastName: childDoc.lastName,
    parentPhone: childDoc.parentPhone,
    parentInfo: childDoc.parentInfo
  });

  // Retourner une liste vide pour parentUserIds car on utilise les rooms pour le ciblage
  return { childId, parentPhone, targetRooms, parentUserIds: [] };
}

/* -------------------------------------------------------------------------- */
/* 📋 GET : toutes les vaccinations                                           */
/* -------------------------------------------------------------------------- */
export const getAllVaccinations = async (_req: Request, res: Response) => {
  try {
    const vaccinations = await Vaccination.find()
      .populate("child", "name birthDate")
      .populate("vaccine", "name")
      .lean();
    res.json(vaccinations);
  } catch (err: any) {
    console.error("Erreur getAllVaccinations:", err);
    res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 📋 GET : vaccinations d’un enfant                                          */
/* -------------------------------------------------------------------------- */
export const getVaccinationsByChild = async (req: Request, res: Response) => {
  try {
    const vaccinations = await Vaccination.find({ child: req.params.childId })
      .populate("child", "name birthDate")
      .populate("vaccine", "name")
      .lean();
    res.json(vaccinations);
  } catch (err: any) {
    console.error("Erreur getVaccinationsByChild:", err);
    res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* ➕ POST : enregistrer une vaccination terminée                             */
/* -------------------------------------------------------------------------- */
export const addVaccination = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { child, vaccine, date, doseNumber } = req.body;
    const user = req.user as AuthUser;
    if (!user)
      return res.status(401).json({ message: "Utilisateur non authentifié" });

    const { id: vaccineId, name: vaccineName } = await resolveVaccine(vaccine);

    const vaccination = await Vaccination.create({
      child,
      vaccine: vaccineId,
      doneDate: date ? new Date(date) : new Date(),
      status: "done",
      ...(typeof doseNumber === "number" && doseNumber > 0
        ? { doseNumber }
        : {}),
      healthCenter: user.healthCenter?.trim(),
      region: user.region?.trim(),
      givenBy: new mongoose.Types.ObjectId(user._id), // ✅ correction ici
    });

    const childDoc = await Child.findById(child).lean();
    if (!childDoc) throw new Error("Enfant introuvable");

    const { childId, targetRooms, parentUserIds } = await resolveParentTargets(
      childDoc
    );

    const doseLabel =
      typeof vaccination.doseNumber === "number" && vaccination.doseNumber > 0
        ? ` (Dose ${vaccination.doseNumber})`
        : "";
    const message = `💉 Le vaccin ${vaccineName}${doseLabel} a été administré à ${
      childDoc.name
    } le ${new Date(vaccination.doneDate ?? new Date()).toLocaleDateString(
      "fr-FR"
    )}.`;

    console.log("📡 Envoi notification vaccin administré:");
    console.log("  - Vaccin:", vaccineName);
    console.log("  - Enfant:", childDoc.name, `(ID: ${childId})`);
    console.log("  - Téléphone parent:", childDoc.parentPhone);
    console.log("  - Rooms cibles:", targetRooms);
    console.log("  - Parents IDs spécifiques:", parentUserIds.map(id => id.toString()));
    console.log("  - 🎯 NOTIFICATION CIBLÉE pour cet enfant uniquement");
    
    sendSocketNotification(io, targetRooms, {
      userId: childId,
      title: `Vaccin ${vaccineName}${doseLabel} administré`,
      message,
      icon: "💉",
      type: "vaccination",
      createdAt: new Date(),
    });

    // Sauvegarder la notification en base avec metadata.childId pour le ciblage
    await Notification.create({
      title: `Vaccin ${vaccineName}${doseLabel} administré`,
      message,
      type: "vaccination",
      icon: "💉",
      targetRoles: ["parent", "agent", "regional", "national"],
      targetUsers: [],
      metadata: { childId }, // ← Ciblage par enfant
      status: "success",
    });
    console.log("✅ Notification sauvegardée en base avec childId:", childId);

    res.status(201).json(vaccination);
  } catch (err: any) {
    console.error("Erreur addVaccination:", err);
    res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 🗓️ POST : programmer une vaccination future                                */
/* -------------------------------------------------------------------------- */
export const scheduleVaccination = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { child, vaccine, scheduledDate, doseNumber } = req.body;
    const user = req.user as AuthUser;
    if (!user)
      return res.status(401).json({ message: "Utilisateur non authentifié" });

    const { id: vaccineId, name: vaccineName } = await resolveVaccine(vaccine);

    const vaccination = await Vaccination.create({
      child,
      vaccine: vaccineId,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      status: "scheduled",
      ...(typeof doseNumber === "number" && doseNumber > 0
        ? { doseNumber }
        : {}),
      healthCenter: user.healthCenter?.trim(),
      region: user.region?.trim(),
      givenBy: new mongoose.Types.ObjectId(user._id), // ✅ correction ici
    });

    const childDoc = await Child.findById(child).lean();
    if (!childDoc) throw new Error("Enfant introuvable");

    const { childId, targetRooms, parentUserIds } = await resolveParentTargets(
      childDoc
    );

    const readableDate = scheduledDate
      ? new Date(scheduledDate).toLocaleDateString("fr-FR")
      : "une date à venir";

    const doseLabel =
      typeof vaccination.doseNumber === "number" && vaccination.doseNumber > 0
        ? ` (Dose ${vaccination.doseNumber})`
        : "";
    const message = `📅 Le vaccin ${vaccineName}${doseLabel} de ${childDoc.name} est prévu pour le ${readableDate}.`;

    console.log("📡 Envoi notification vaccin programmé:");
    console.log("  - Vaccin:", vaccineName);
    console.log("  - Enfant:", childDoc.name, `(ID: ${childId})`);
    console.log("  - Téléphone parent:", childDoc.parentPhone);
    console.log("  - Date prévue:", readableDate);
    console.log("  - Rooms cibles:", targetRooms);
    console.log("  - Parents IDs spécifiques:", parentUserIds.map(id => id.toString()));
    console.log("  - 🎯 NOTIFICATION CIBLÉE pour cet enfant uniquement");
    
    sendSocketNotification(io, targetRooms, {
      userId: childId,
      title: `Vaccin ${vaccineName}${doseLabel} programmé`,
      message,
      icon: "📅",
      type: "vaccination",
      createdAt: new Date(),
    });

    // Toujours sauvegarder la notification en base
    await Notification.create({
      title: `Vaccin ${vaccineName}${doseLabel} programmé`,
      message,
      type: "vaccination",
      icon: "📅",
      targetRoles: ["parent", "agent", "regional", "national"],
      targetUsers: [],
      metadata: { childId }, // ← Ciblage par enfant
      status: "info",
    });
    console.log("✅ Notification sauvegardée en base avec childId:", childId);

    res.status(201).json(vaccination);
  } catch (err: any) {
    console.error("Erreur scheduleVaccination:", err);
    res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* ✅ PUT : marquer une vaccination comme faite                              */
/* -------------------------------------------------------------------------- */
export const completeVaccination = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user as AuthUser;
    const vaccination = await Vaccination.findById(req.params.id).populate(
      "vaccine",
      "name"
    );
    if (!vaccination)
      return res.status(404).json({ message: "Vaccination non trouvée" });

    vaccination.status = "done";
    vaccination.doneDate = new Date();
    vaccination.healthCenter =
      user?.healthCenter?.trim() || vaccination.healthCenter;
    vaccination.region = user?.region?.trim() || vaccination.region;
    vaccination.givenBy = new mongoose.Types.ObjectId(user._id); // ✅ correction ici

    await vaccination.save();

    const vaccineName = (vaccination.vaccine as any)?.name ?? "inconnu";

    // 📦 Décrémenter le stock automatiquement
    try {
      const healthCenter = vaccination.healthCenter || user?.healthCenter;
      if (healthCenter && vaccineName) {
        // Trouver le stock correspondant au centre et au vaccin
        const stock = await Stock.findOne({
          vaccine: vaccineName.toUpperCase(),
          healthCenter: healthCenter,
        });

        if (stock) {
          if (stock.quantity > 0) {
            stock.quantity -= 1;
            await stock.save();
            console.log(`✅ Stock décrémenté: ${vaccineName} au centre ${healthCenter}, reste ${stock.quantity}`);
          } else {
            console.warn(`⚠️ Stock épuisé pour ${vaccineName} au centre ${healthCenter}`);
          }
        } else {
          console.warn(`⚠️ Aucun stock trouvé pour ${vaccineName} au centre ${healthCenter}`);
        }
      }
    } catch (stockErr: any) {
      // Ne pas bloquer la vaccination si le stock ne peut pas être mis à jour
      console.error("❌ Erreur lors de la décrémentation du stock:", stockErr.message);
    }

    const childDoc = await Child.findById(vaccination.child).lean();
    if (!childDoc) throw new Error("Enfant introuvable");

    const { childId, targetRooms, parentUserIds } = await resolveParentTargets(
      childDoc
    );

    const doseLabel =
      typeof vaccination.doseNumber === "number" && vaccination.doseNumber > 0
        ? ` (Dose ${vaccination.doseNumber})`
        : "";
    const message = `✅ Le vaccin ${vaccineName}${doseLabel} de ${
      childDoc.name
    } a été confirmé comme administré le ${new Date().toLocaleDateString(
      "fr-FR"
    )}.`;

    console.log("📡 Envoi notification vaccin complété:");
    console.log("  - Vaccin:", vaccineName);
    console.log("  - Enfant:", childDoc.name, `(ID: ${childId})`);
    console.log("  - Téléphone parent:", childDoc.parentPhone);
    console.log("  - Rooms cibles:", targetRooms);
    console.log("  - Parents IDs spécifiques:", parentUserIds.map(id => id.toString()));
    console.log("  - 🎯 NOTIFICATION CIBLÉE pour cet enfant uniquement");
    
    sendSocketNotification(io, targetRooms, {
      title: `Vaccin ${vaccineName}${doseLabel} complété`,
      message,
      icon: "💉",
      type: "vaccination",
      createdAt: new Date(),
    });

    // Toujours sauvegarder la notification en base
    await Notification.create({
      title: `Vaccin ${vaccineName}${doseLabel} complété`,
      message,
      type: "vaccination",
      icon: "💉",
      targetRoles: ["parent", "agent", "regional", "national"],
      targetUsers: [],
      metadata: { childId }, // ← Ciblage par enfant
      status: "success",
    });
    console.log("✅ Notification sauvegardée en base avec childId:", childId);

    res.json({ message: "Vaccination complétée ✅", vaccination });
  } catch (err: any) {
    console.error("Erreur completeVaccination:", err);
    res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* ✏️ PUT : mise à jour d’une vaccination (avec centre/région si manquants)  */
/* -------------------------------------------------------------------------- */
export const updateVaccination = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user as AuthUser;
    const updates = {
      ...req.body,
      healthCenter: req.body.healthCenter ?? user?.healthCenter?.trim(),
      region: req.body.region ?? user?.region?.trim(),
    };

    const updated = await Vaccination.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Vaccination non trouvée" });

    res.json(updated);
  } catch (err: any) {
    console.error("Erreur updateVaccination:", err);
    res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* ❌ MARQUER UN VACCIN COMME RATÉ MANUELLEMENT (avec notification)          */
/* -------------------------------------------------------------------------- */
export const markVaccinationMissed = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Trouver la vaccination avec les données enfant et vaccin
    const vaccination = await Vaccination.findById(id)
      .populate("vaccine", "name")
      .populate("child", "name parentPhone");
    
    if (!vaccination) {
      return res.status(404).json({ message: "Vaccination non trouvée" });
    }
    
    // Mettre à jour le statut
    vaccination.status = "missed";
    await vaccination.save();
    
    const childDoc: any = vaccination.child;
    const vaccineDoc: any = vaccination.vaccine;
    
    if (childDoc && vaccineDoc) {
      const { childId, targetRooms, parentUserIds } = await resolveParentTargets(childDoc);
      
      const scheduledDateStr = vaccination.scheduledDate 
        ? new Date(vaccination.scheduledDate).toLocaleDateString("fr-FR")
        : "une date prévue";
      const doseLabel =
        typeof (vaccination as any).doseNumber === "number" && (vaccination as any).doseNumber > 0
          ? ` (Dose ${(vaccination as any).doseNumber})`
          : "";
      const message = `⚠️ Le vaccin ${vaccineDoc.name}${doseLabel} de ${childDoc.name} prévu le ${scheduledDateStr} a été marqué comme raté par l'agent. Veuillez contacter le centre de santé pour le reprogrammer.`;
      
      console.log("📡 Envoi notification vaccin marqué raté:");
      console.log("  - Vaccin:", vaccineDoc.name);
      console.log("  - Enfant:", childDoc.name, `(ID: ${childId})`);
      console.log("  - Téléphone parent:", childDoc.parentPhone);
      console.log("  - Date prévue:", scheduledDateStr);
      console.log("  - Rooms cibles:", targetRooms);
      console.log("  - Parents IDs spécifiques:", parentUserIds.map(id => id.toString()));
      console.log("  - NOTIFICATION CIBLÉE pour cet enfant uniquement");
      
      // Socket.io notification
      sendSocketNotification(io, targetRooms, {
        title: `Vaccin ${vaccineDoc.name}${doseLabel} raté`,
        message,
        icon: "⚠️",
        type: "vaccination",
        status: "warning",
        createdAt: new Date(),
      });
      
      // Notification en base - toujours sauvegarder
      await Notification.create({
        title: `Vaccin ${vaccineDoc.name}${doseLabel} raté`,
        message,
        type: "vaccination",
        icon: "⚠️",
        targetRoles: ["parent", "agent", "regional", "national"],
        targetUsers: [],
        metadata: { childId }, // ← Ciblage par enfant
        status: "warning",
      });
      console.log("✅ Notification sauvegardée en base avec childId:", childId);
      
      console.log(`📧 Notification envoyée pour vaccin marqué raté: ${vaccineDoc.name} - ${childDoc.name}`);
    }
    
    res.json({ 
      message: "Vaccin marqué comme raté ❌", 
      vaccination: {
        ...vaccination.toObject(),
        vaccine: vaccineDoc,
        child: childDoc
      }
    });
  } catch (err: any) {
    console.error("Erreur markVaccinationMissed:", err);
    res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 🚫 PUT : annuler une vaccination + notification parent                    */
/* -------------------------------------------------------------------------- */
export const cancelVaccination = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body; // Raison de l'annulation
    
    const vaccination = await Vaccination.findById(id)
      .populate("vaccine", "name")
      .populate("child", "name parentPhone parentInfo");

    if (!vaccination) {
      return res.status(404).json({ message: "Vaccination non trouvée" });
    }

    // Mettre à jour le statut
    vaccination.status = "cancelled";
    if (reason) {
      vaccination.notes = vaccination.notes 
        ? `${vaccination.notes} | Annulé: ${reason}` 
        : `Annulé: ${reason}`;
    }
    await vaccination.save();

    const vaccineDoc = vaccination.vaccine as any;
    const childDoc = vaccination.child as any;
    const childId = childDoc._id.toString();
    
    // Préparer les rooms pour Socket.io
    const targetRooms = [`child_${childId}`];
    const parentPhone = childDoc.parentInfo?.phone || childDoc.parentPhone;
    if (parentPhone) {
      targetRooms.push(`parent_${parentPhone}_child_${childId}`);
    }

    // Message de notification
    const message = reason
      ? `❌ La vaccination ${vaccineDoc.name} de votre enfant ${childDoc.name} a été annulée pour la raison suivante : ${reason}. Veuillez contacter votre centre de santé pour plus d'informations.`
      : `❌ La vaccination ${vaccineDoc.name} de votre enfant ${childDoc.name} a été annulée. Veuillez contacter votre centre de santé pour plus d'informations.`;

    // Créer la notification dans la base
    const notification = await Notification.create({
      title: "❌ Vaccination annulée",
      message,
      type: "vaccination",
      icon: "❌",
      targetRoles: ["parent", "agent", "regional", "national"],
      targetUsers: [],
      metadata: { childId },
      status: "danger",
    });

    console.log("✅ Notification d'annulation sauvegardée en base avec childId:", childId);

    // Envoyer notification Socket.io
    sendSocketNotification(io, targetRooms, {
      title: "❌ Vaccination annulée",
      message,
      icon: "❌",
      type: "vaccination",
      status: "danger",
      createdAt: notification.createdAt,
    });

    console.log(`📧 Notification d'annulation envoyée: ${vaccineDoc.name} - ${childDoc.name}`);
    console.log(`   Motif: ${reason || 'Non précisé'}`);

    res.json({
      message: "Vaccination annulée et notification envoyée ❌",
      vaccination: {
        ...vaccination.toObject(),
        vaccine: vaccineDoc,
        child: childDoc,
      },
    });
  } catch (err: any) {
    console.error("Erreur cancelVaccination:", err);
    res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 🗑️ DELETE : suppression d'une vaccination                                 */
/* -------------------------------------------------------------------------- */
export const deleteVaccination = async (req: Request, res: Response) => {
  try {
    const deleted = await Vaccination.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Vaccination non trouvée" });

    res.json({ message: "Vaccination supprimée ✅" });
  } catch (err: any) {
    console.error("Erreur deleteVaccination:", err);
    res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 🔄 CRON : Mettre à jour les vaccinations ratées (automatique)             */
/* -------------------------------------------------------------------------- */
export const updateMissedVaccinations = async () => {
  const now = new Date();
  
  // Trouver les vaccinations ratées avant de les mettre à jour
  const missedVaccinations = await Vaccination.find({
    status: "scheduled",
    scheduledDate: { $lt: now }
  }).populate("vaccine", "name").populate("child", "name parentPhone");
  
  // Mettre à jour le statut
  const missed = await Vaccination.updateMany(
    { status: "scheduled", scheduledDate: { $lt: now } },
    { status: "missed" }
  );
  
  console.log(`🔔 ${missed.modifiedCount} vaccination(s) marquée(s) comme ratée(s).`);
  
  // Envoyer des notifications pour chaque vaccination ratée
  for (const vaccination of missedVaccinations) {
    try {
      const childDoc: any = vaccination.child;
      const vaccineDoc: any = vaccination.vaccine;
      
      if (!childDoc || !vaccineDoc) continue;
      
      const { childId, targetRooms, parentUserIds } = await resolveParentTargets(childDoc);
      
      const message = `⚠️ Le vaccin ${vaccineDoc.name} de ${childDoc.name} prévu le ${new Date(vaccination.scheduledDate!).toLocaleDateString("fr-FR")} n'a pas été administré. Veuillez contacter le centre de santé pour le reprogrammer.`;
      
      // Socket.io notification
      sendSocketNotification(io, targetRooms, {
        title: `Vaccin ${vaccineDoc.name} raté`,
        message,
        icon: "⚠️",
        type: "vaccination",
        status: "warning",
        createdAt: new Date(),
      });
      
      // Notification en base - toujours sauvegarder
      await Notification.create({
        title: `Vaccin ${vaccineDoc.name} raté`,
        message,
        type: "vaccination",
        icon: "⚠️",
        targetRoles: ["parent", "agent", "regional", "national"],
        targetUsers: parentUserIds.length > 0 ? parentUserIds : [],
        metadata: { childId }, // Ajouter childId pour filtrage
        status: "warning",
      });
      
      console.log(`📧 Notification envoyée pour vaccin raté: ${vaccineDoc.name} - ${childDoc.name}`);
    } catch (err: any) {
      console.error("Erreur notification vaccin raté:", err.message);
    }
  }
  
  // Met à jour les enfants correspondants
  await Child.updateMany(
    { nextAppointment: { $lt: now } },
    { $set: { status: "En retard" } }
  );
  console.log(`🕒 ${missed.modifiedCount} vaccins marqués comme ratés.`);
};

/* -------------------------------------------------------------------------- */
/* 🧹 DELETE : suppression de toutes les données seed                         */
/* -------------------------------------------------------------------------- */
export const purgeSeedVaccinations = async (_req: Request, res: Response) => {
  try {
    const deleted = await Vaccination.deleteMany({});
    res.json({
      message: `✅ ${deleted.deletedCount} vaccinations supprimées.`,
    });
  } catch (err: any) {
    console.error("Erreur purgeSeedVaccinations:", err);
    res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 🌍 PUBLIC : vaccinations + rendez-vous fusionnés                           */
/* -------------------------------------------------------------------------- */
export const getVaccinationAndAppointmentsByChild = async (
  req: Request,
  res: Response
) => {
  try {
    const { childId } = req.params;

    const vaccinations = await Vaccination.find({ child: childId })
      .populate("vaccine", "name")
      .lean();

    const appointments = await Appointment.find({ child: childId })
      .populate("vaccine", "name")
      .lean();

    const merged: any[] = [];
    const seen = new Set<string>();

    for (const v of vaccinations) {
      const date = v.doneDate || v.scheduledDate || new Date();
      const name = (v.vaccine as any)?.name ?? "Vaccin inconnu";
      const key = `${name}-${date.toISOString()}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({
          _id: v._id,
          name,
          date,
          status: v.status ?? "done",
          type: "vaccination",
          doseNumber: typeof (v as any).doseNumber === "number" ? (v as any).doseNumber : undefined,
        });
      }
    }

    for (const a of appointments) {
      const date = a.date || new Date();
      const name = (a.vaccine as any)?.name ?? "Vaccin inconnu";
      const key = `${name}-${date.toISOString()}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({
          _id: a._id,
          name,
          date,
          status: a.status ?? "scheduled",
          type: "appointment",
          // Les rendez-vous ne portent pas toujours la dose; laisser undefined
        });
      }
    }

    merged.sort((a, b) => +new Date(a.date) - +new Date(b.date));
    res.json({ merged });
  } catch (err: any) {
    console.error("Erreur getVaccinationAndAppointmentsByChild:", err);
    res.status(500).json({ message: err.message });
  }
};

// Récupérer le carnet de vaccination complet d'un enfant
export const getVaccinationRecord = async (req: Request, res: Response) => {
  try {
    const { childId } = req.params;

    // Vérifier que l'enfant existe
    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({ message: "Enfant non trouvé" });
    }

    // Récupérer toutes les vaccinations de l'enfant
    const vaccinations = await Vaccination.find({ child: childId })
      .populate('vaccine', 'name description')
      .populate('givenBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Formater les données pour le frontend
    const formattedVaccinations = vaccinations.map((vaccination) => {
      const v: any = (vaccination as any).vaccine || {};
      const giver: any = (vaccination as any).givenBy || null;
      return {
        id: vaccination._id,
        vaccineName: v?.name || 'Vaccin inconnu',
        scheduledDate: vaccination.scheduledDate,
        doneDate: vaccination.doneDate,
        status: vaccination.status,
        notes: vaccination.notes,
        givenBy: giver ? `${giver.firstName ?? ''} ${giver.lastName ?? ''}`.trim() || 'Agent inconnu' : 'Agent inconnu',
        createdAt: vaccination.createdAt,
      };
    });

    // Calculer les statistiques
    const stats = {
      total: vaccinations.length,
      completed: vaccinations.filter(v => v.status === 'done').length,
      scheduled: vaccinations.filter(v => v.status === 'scheduled').length,
      missed: vaccinations.filter(v => v.status === 'missed').length,
      cancelled: vaccinations.filter(v => v.status === 'cancelled').length
    };

    res.json({
      success: true,
      child: {
        id: child._id,
        name: `${child.firstName} ${child.lastName}`,
        birthDate: child.birthDate,
        gender: child.gender,
        parentName: child.parentName
      },
      vaccinations: formattedVaccinations,
      stats
    });

  } catch (err: any) {
    console.error("Erreur getVaccinationRecord:", err);
    res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 🔄 REPROGRAMMER : Reprogrammer un vaccin raté                             */
/* -------------------------------------------------------------------------- */
export const rescheduleVaccination = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { scheduledDate } = req.body;

    if (!scheduledDate) {
      return res.status(400).json({ message: "Date de reprogrammation requise" });
    }

    // Vérifier que la vaccination existe et est ratée
    const vaccination = await Vaccination.findById(id).populate("vaccine").populate("child");
    if (!vaccination) {
      return res.status(404).json({ message: "Vaccination introuvable" });
    }

    if (vaccination.status !== "missed") {
      return res.status(400).json({ message: "Seuls les vaccins ratés peuvent être reprogrammés" });
    }

    // Mettre à jour la vaccination
    vaccination.status = "scheduled";
    vaccination.scheduledDate = new Date(scheduledDate);
    vaccination.notes = `Reprogrammé le ${new Date().toLocaleDateString('fr-FR')} par l'agent`;
    
    await vaccination.save();

    console.log("✅ Vaccination reprogrammée:", {
      id: vaccination._id,
      vaccine: ((vaccination as any).vaccine as any)?.name,
      newDate: scheduledDate,
      child: ((vaccination as any).child as any)?.name,
    });

    // Récupérer les informations pour la notification
    const childDoc: any = (vaccination as any).child;
    const vaccineDoc: any = (vaccination as any).vaccine;
    
    const { childId, targetRooms, parentUserIds } = await resolveParentTargets(childDoc);
    
    const doseLabel = typeof vaccination.doseNumber === "number" && vaccination.doseNumber > 0
      ? ` (Dose ${vaccination.doseNumber})`
      : "";
    
    const formattedDate = new Date(scheduledDate).toLocaleDateString("fr-FR");
    const formattedTime = new Date(scheduledDate).toLocaleTimeString("fr-FR", { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const message = `📅 Le vaccin ${vaccineDoc?.name}${doseLabel} de ${childDoc?.name} qui était raté a été reprogrammé pour le ${formattedDate} à ${formattedTime}. Veuillez vous présenter au centre de santé à l'heure prévue.`;

    console.log("📡 Envoi notification reprogrammation:");
    console.log("  - Vaccin:", vaccineDoc?.name);
    console.log("  - Enfant:", childDoc?.name, `(ID: ${childId})`);
    console.log("  - Nouvelle date:", formattedDate, formattedTime);
    console.log("  - Rooms cibles:", targetRooms);
    
    // Envoyer notification Socket.io
    sendSocketNotification(io, targetRooms, {
      userId: childId,
      title: `Vaccin ${vaccineDoc?.name}${doseLabel} reprogrammé`,
      message,
      icon: "🔄",
      type: "vaccination",
      status: "info",
      createdAt: new Date().toISOString(),
    });

    // Sauvegarder la notification en base
    await Notification.create({
      title: `Vaccin ${vaccineDoc?.name}${doseLabel} reprogrammé`,
      message,
      type: "vaccination",
      icon: "🔄",
      targetRoles: ["parent", "agent", "regional", "national"],
      targetUsers: [],
      metadata: { childId },
      status: "info",
    });

    console.log("✅ Notification de reprogrammation envoyée");

    res.json({
      success: true,
      message: "Vaccin reprogrammé avec succès",
      vaccination: {
        _id: vaccination._id,
        status: vaccination.status,
        scheduledDate: vaccination.scheduledDate,
        vaccine: vaccination.vaccine,
        child: vaccination.child
      }
    });

  } catch (err: any) {
    console.error("Erreur rescheduleVaccination:", err);
    res.status(500).json({ message: err.message });
  }
};
