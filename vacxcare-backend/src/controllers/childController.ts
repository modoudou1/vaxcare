import { Request, Response } from "express";
import { AuthUser, AuthenticatedRequest } from "../middleware/auth";
import Child from "../models/Child";
import VaccineSchedule from "../models/VaccineSchedule";
import User from "../models/User";
import { sendSMS } from "../services/sms";
import { sendParentAccessCode } from "../services/notification";
import { calculateChildCompletionRate } from "../utils/completionRate";

// Local minimal types to avoid cross-module TS issues
type ParentInfo = {
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
};

type VaccinationRecord = {
  vaccineName: string;
  date: Date;
  status: "done" | "scheduled" | "overdue" | "planned";
  [key: string]: any;
};

type MedicalInfo = { [key: string]: any };

/* -------------------------------------------------------------------------- */
/* 🧮 UTILITAIRES                                                             */
/* -------------------------------------------------------------------------- */

// ✅ Calcul de l’âge en mois
function getAgeInMonths(dob: Date): number {
  const now = new Date();
  let months = (now.getFullYear() - dob.getFullYear()) * 12;
  months += now.getMonth() - dob.getMonth();
  if (now.getDate() < dob.getDate()) months -= 1;
  return months;
}

// ✅ Conversion d’âge (semaines / années → mois)
function toMonths(age: number, unit: string): number {
  if (unit === "weeks") return Math.round(age / 4.3);
  if (unit === "years") return age * 12;
  return age;
}

/* -------------------------------------------------------------------------- */
/* 👶 CRÉER UN ENFANT + ENVOYER SMS                                           */
/* -------------------------------------------------------------------------- */
export const createChild = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Non autorisé" });

    // Accepte l'ancien payload (name, parentName, parentPhone)
    // et le nouveau payload (firstName, lastName, parentInfo: { parentName, parentPhone })
    const {
      name: legacyName,
      firstName: bodyFirstName,
      lastName: bodyLastName,
      birthDate,
      gender,
      address,
      parentName: legacyParentName,
      parentPhone: legacyParentPhone,
      parentInfo: bodyParentInfo,
    } = req.body || {};

    // Résoudre prénom/nom
    let firstName = (bodyFirstName || "").trim();
    let lastName = (bodyLastName || "").trim();
    if ((!firstName || !lastName) && typeof legacyName === "string") {
      const parts = legacyName.trim().split(/\s+/).filter(Boolean);
      if (parts.length > 1) {
        firstName = parts.slice(0, -1).join(" ");
        lastName = parts[parts.length - 1];
      } else if (parts.length === 1) {
        // S'il n'y a qu'un mot, on le duplique de manière conservatrice
        firstName = parts[0];
        lastName = parts[0];
      }
    }

    // Parent info
    const parentInfo: ParentInfo = {
      parentName: (bodyParentInfo?.parentName || legacyParentName || "").trim(),
      parentPhone: (bodyParentInfo?.parentPhone || legacyParentPhone || "").trim(),
      parentEmail: bodyParentInfo?.parentEmail,
      emergencyContact: bodyParentInfo?.emergencyContact,
      emergencyPhone: bodyParentInfo?.emergencyPhone,
    } as ParentInfo;

    const dob = new Date(birthDate);
    const ageInMonths = getAgeInMonths(dob);

    // 🔹 Trouver le calendrier vaccinal correspondant
    const schedules = await VaccineSchedule.find().lean();
    const currentSchedule = schedules.find((s) => {
      const min = toMonths(s.minAge ?? 0, s.unit);
      const max = s.maxAge !== undefined && s.maxAge !== null
        ? toMonths(s.maxAge, s.unit)
        : min;
      return ageInMonths >= min && ageInMonths <= max;
    });
    const vaccinesDue = currentSchedule ? currentSchedule.vaccines : [];

    // 🔹 Prochain vaccin prévu
    const nextSchedule = schedules.find((s) => {
      const min = toMonths(s.minAge ?? 0, s.unit);
      return min > ageInMonths;
    });

    let nextAppointment: Date | undefined;

    // 🔹 Création de l’enfant
    const child = await Child.create({
      // Champs requis par le schéma
      firstName,
      lastName,
      birthDate,
      gender,
      parentInfo,
      // Champs additionnels
      name: legacyName || `${firstName} ${lastName}`.trim(), // compatibilité UI/mobile
      parentName: parentInfo.parentName, // compatibilité legacy
      parentPhone: parentInfo.parentPhone, // compatibilité legacy
      address,
      status: "Non programmé",
      vaccinesDue,
      nextAppointment: null,
      region: req.user.region || "Inconnue",
      healthCenter: req.user.healthCenter || "Non défini",
      createdBy: req.user.id,
    });

    // 🔹 Envoi du code d'accès par WhatsApp + SMS
    const smsParentName = parentInfo.parentName || legacyParentName || "Parent";
    const displayName = legacyName || `${firstName} ${lastName}`.trim();
    const accessCode =
      child.parentAccessCode || (child as any)?._id?.toString?.() || String((child as any)?._id);
    
    if (parentInfo.parentPhone) {
      // Envoyer par WhatsApp en priorité, avec fallback SMS
      await sendParentAccessCode(
        parentInfo.parentPhone,
        smsParentName,
        displayName,
        accessCode,
        "both" // Envoie par WhatsApp ET SMS pour garantir la réception
      );
    }

    return res.status(201).json(child);
  } catch (err: any) {
    console.error("❌ createChild error:", err);
    return res
      .status(500)
      .json({ message: "Erreur serveur", error: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 📋 LISTE DES ENFANTS (avec agrégation vaccin + filtrage centre)            */
/* -------------------------------------------------------------------------- */
export const getChildren = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Non autorisé" });

    // ✅ Règle principale : un agent voit tous les enfants de son centre
    // ✅ Un régional voit tous les enfants de sa région
    let match: any = {};
    if (req.user.role === "agent") {
      match.healthCenter = req.user.healthCenter;
    } else if (req.user.role === "regional") {
      match.region = req.user.region;
    }

    // 🔹 Agrégation avec lookup vers "vaccinations"
    const children = await Child.aggregate([
      { $match: match },

      {
        $lookup: {
          from: "vaccinations",
          localField: "_id",
          foreignField: "child",
          as: "vaccinations",
          pipeline: [
            {
              $match: {
                status: "scheduled",
                scheduledDate: { $gte: new Date() },
              },
            },
            { $sort: { scheduledDate: 1 } },
            { $limit: 1 },
          ],
        },
      },

      {
        $addFields: {
          nextAppointment: {
            $ifNull: [
              { $arrayElemAt: ["$vaccinations.scheduledDate", 0] },
              "$nextAppointment",
            ],
          },
        },
      },

      {
        $project: {
          vaccinations: 0,
          __v: 0,
        },
      },
    ]);

    res.json(children);
  } catch (err: any) {
    console.error("❌ getChildren aggregation error:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 🔎 OBTENIR LES DÉTAILS D’UN ENFANT                                         */
/* -------------------------------------------------------------------------- */
export const getChildById = async (req: AuthRequest, res: Response) => {
  try {
    const child: any = await Child.findById(req.params.id).lean();
    if (!child) return res.status(404).json({ message: "Enfant introuvable" });
    res.json(child);
  } catch (err) {
    console.error("getChildById error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/* -------------------------------------------------------------------------- */
/* ✏️ MODIFIER UN ENFANT                                                      */
/* -------------------------------------------------------------------------- */
export const updateChild = async (req: AuthRequest, res: Response) => {
  try {
    const updates = req.body;
    const child = await Child.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).lean();
    if (!child) return res.status(404).json({ message: "Enfant introuvable" });
    res.json(child);
  } catch (err) {
    console.error("updateChild error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/* -------------------------------------------------------------------------- */
/* ❌ SUPPRIMER UN ENFANT                                                     */
/* -------------------------------------------------------------------------- */
export const deleteChild = async (req: AuthRequest, res: Response) => {
  try {
    const child = await Child.findByIdAndDelete(req.params.id).lean();
    if (!child) return res.status(404).json({ message: "Enfant introuvable" });
    res.json({ message: "Enfant supprimé" });
  } catch (err) {
    console.error("deleteChild error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/* -------------------------------------------------------------------------- */
/* ✅ VÉRIFIER ENFANT PAR ID + TÉLÉPHONE (mobile LinkChild)                   */
/* -------------------------------------------------------------------------- */
export const verifyChildByPhone = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    let { phone } = req.query;

    if (!id || !phone) {
      return res
        .status(400)
        .json({ success: false, message: "Code enfant et téléphone requis" });
    }

    // Normaliser et générer plusieurs variantes pour correspondre aux anciens/nouveaux formats
    const raw = String(phone).trim();
    const digits = raw.replace(/[^\d]/g, "");

    const variants = new Set<string>();
    // Ajouter tel quel
    if (raw) variants.add(raw);
    if (digits) variants.add(digits);
    // 9 chiffres → ajouter formats 221, +221, 0
    if (digits.length === 9) {
      variants.add(`221${digits}`);
      variants.add(`+221${digits}`);
      variants.add(`0${digits}`);
    }
    // 12 chiffres commençant par 221 → ajouter variantes
    if (digits.length === 12 && digits.startsWith("221")) {
      variants.add(digits); // 221XXXXXXXXX
      variants.add(`+${digits}`);
      variants.add(digits.slice(3)); // 9 chiffres
    }
    // 14 chiffres commençant par 00221
    if (digits.length === 14 && digits.startsWith("00221")) {
      const nine = digits.slice(5);
      variants.add(nine);
      variants.add(`221${nine}`);
      variants.add(`+221${nine}`);
      variants.add(`0${nine}`);
    }

    const variantArray = Array.from(variants);

    // 🔐 Chercher l'enfant soit par ID MongoDB soit par code d'accès parent
    let child: any;
    
    // Si id est un code à 6 chiffres, chercher par parentAccessCode
    if (/^\d{6}$/.test(id)) {
      child = await Child.findOne({
        parentAccessCode: id,
        $or: [
          { parentPhone: { $in: variantArray } }, // champ legacy
          { 'parentInfo.parentPhone': { $in: variantArray } }, // champ imbriqué canonique
        ],
      }).lean();
      
      if (child) {
        console.log("✅ Enfant trouvé avec le code d'accès:", id);
      }
    } else {
      // Sinon, chercher par ID MongoDB (ancien format)
      child = await Child.findOne({
        _id: id,
        $or: [
          { parentPhone: { $in: variantArray } }, // champ legacy
          { 'parentInfo.parentPhone': { $in: variantArray } }, // champ imbriqué canonique
        ],
      }).lean();
      
      if (child) {
        console.log("✅ Enfant trouvé avec l'ID MongoDB:", id);
      }
    }

    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Aucun enfant trouvé pour cet ID et numéro de téléphone.",
      });
    }

    return res.json({
      success: true,
      child: {
        id: child._id,
        parentAccessCode: child.parentAccessCode, // 🎲 Code d'accès facile à retenir
        name: child.name,
        parentName: child.parentName,
        birthDate: child.birthDate,
        gender: child.gender,
        status: child.status,
        vaccinesDue: child.vaccinesDue || [],
        nextAppointment: child.nextAppointment || null,
        healthCenter: child.healthCenter || "Non défini",
        region: child.region || "Inconnue",
      },
    });
  } catch (err: any) {
    console.error("❌ verifyChildByPhone error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: err.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/* 📌 ATTACHER UN ENFANT À UN CENTRE DE SANTÉ                                 */
/* -------------------------------------------------------------------------- */
export const attachExistingChild = async (req: Request, res: Response) => {
  try {
    const { sourceId, healthCenter, region } = req.body;

    if (!sourceId || !healthCenter || !region) {
      return res.status(400).json({
        success: false,
        message: "Les informations requises sont manquantes.",
      });
    }

    const child = await Child.findById(sourceId);
    if (!child) {
      return res
        .status(404)
        .json({ success: false, message: "Enfant introuvable." });
    }

    child.healthCenter = healthCenter;
    child.region = region;
    await child.save();
const full = await Child.findById(child._id).lean();
return res.json({
  success: true,
  message: "Enfant attaché avec succès au centre.",
  child: full,
});
  } catch (err: any) {
    console.error("Erreur lors de l'attachement :", err.message);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

/* -------------------------------------------------------------------------- */
/* 👶 PROFIL COMPLET D'UN ENFANT                                             */
/* -------------------------------------------------------------------------- */
export const getChildProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Non autorisé" });

    const childId = req.params.id;
    const child: any = await Child.findById(childId)
      .populate('createdBy', 'firstName lastName email')
      .lean();

    if (!child) {
      return res.status(404).json({ message: "Enfant introuvable" });
    }

    // Vérification des permissions
    const currentUser = req.user;
    if (currentUser.role === "agent" && child.createdBy.toString() !== currentUser.id) {
      return res.status(403).json({ message: "Accès non autorisé à cet enfant" });
    }
    if (currentUser.role === "regional" && child.region !== currentUser.region) {
      return res.status(403).json({ message: "Enfant hors de votre région" });
    }

    // Enrichir les données avec des informations calculées
    const enrichedChild = {
      ...child,
      age: getAgeInMonths(child.birthDate),
      ageFormatted: formatAge(child.birthDate),
      vaccinationProgress: calculateVaccinationProgress(child.vaccinationRecords || []),
    };

    res.json({
      success: true,
      data: enrichedChild
    });
  } catch (err: any) {
    console.error("Erreur récupération profil enfant:", err.message);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

/* -------------------------------------------------------------------------- */
/* 💉 AJOUTER/MODIFIER UNE VACCINATION                                        */
/* -------------------------------------------------------------------------- */
export const addVaccination = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Non autorisé" });

    const childId = req.params.id;
    const vaccinationData: VaccinationRecord = req.body;

    const child = await Child.findById(childId) as any;
    if (!child) {
      return res.status(404).json({ message: "Enfant introuvable" });
    }

    // Vérification des permissions
    const currentUser = req.user;
    if (currentUser.role === "agent" && child.createdBy.toString() !== currentUser.id) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    // Ajouter des informations automatiques
    const agent = await User.findById(currentUser.id);
    const enrichedVaccination: VaccinationRecord = {
      ...vaccinationData,
      agent: agent ? `${agent.firstName} ${agent.lastName}` : currentUser.email,
      healthCenter: child.healthCenter || currentUser.healthCenter || "Centre non défini",
      ageAtVaccination: formatAge(child.birthDate),
    };

    // Ajouter la vaccination
    if (!child.vaccinationRecords) {
      child.vaccinationRecords = [];
    }
    child.vaccinationRecords.push(enrichedVaccination);

    // Mettre à jour aussi l'ancien format pour compatibilité
    if (vaccinationData.status === "done") {
      if (!child.vaccinesDone) child.vaccinesDone = [];
      child.vaccinesDone.push({
        name: vaccinationData.vaccineName,
        date: vaccinationData.date,
      });
    }

    await child.save();

    res.json({
      success: true,
      message: "Vaccination ajoutée avec succès",
      vaccination: enrichedVaccination
    });
  } catch (err: any) {
    console.error("Erreur ajout vaccination:", err.message);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

/* -------------------------------------------------------------------------- */
/* 🩺 METTRE À JOUR LES INFORMATIONS MÉDICALES                               */
/* -------------------------------------------------------------------------- */
export const updateMedicalInfo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Non autorisé" });

    const childId = req.params.id;
    const medicalData: Partial<MedicalInfo> = req.body;

    const child: any = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({ message: "Enfant introuvable" });
    }

    // Vérification des permissions
    const currentUser = req.user;
    if (currentUser.role === "agent" && child.createdBy.toString() !== currentUser.id) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    // Mettre à jour les informations médicales
    if (!child.medicalInfo) {
      child.medicalInfo = {};
    }

    Object.assign(child.medicalInfo, medicalData);
    child.medicalInfo.lastVisit = new Date();

    await child.save();

    res.json({
      success: true,
      message: "Informations médicales mises à jour",
      medicalInfo: child.medicalInfo
    });
  } catch (err: any) {
    console.error("Erreur mise à jour médicale:", err.message);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

/* -------------------------------------------------------------------------- */
/* 👨‍👩‍👧‍👦 METTRE À JOUR LES INFORMATIONS PARENT                                   */
/* -------------------------------------------------------------------------- */
export const updateParentInfo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Non autorisé" });

    const childId = req.params.id;
    const parentData = req.body;

    const child: any = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({ message: "Enfant introuvable" });
    }

    // Vérification des permissions
    const currentUser = req.user;
    if (currentUser.role === "agent" && child.createdBy.toString() !== currentUser.id) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    // Mettre à jour les informations parent
    if (!child.parentInfo) {
      child.parentInfo = {
        parentName: "",
        parentPhone: "",
      };
    }

    Object.assign(child.parentInfo, parentData);

    await child.save();

    res.json({
      success: true,
      message: "Informations parent mises à jour",
      parentInfo: child.parentInfo
    });
  } catch (err: any) {
    console.error("Erreur mise à jour parent:", err.message);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

/* -------------------------------------------------------------------------- */
/* 🧮 UTILITAIRES POUR LE PROFIL                                             */
/* -------------------------------------------------------------------------- */
function formatAge(birthDate: Date): string {
  const ageInMonths = getAgeInMonths(birthDate);
  
  if (ageInMonths < 12) {
    return `${ageInMonths} mois`;
  } else {
    const years = Math.floor(ageInMonths / 12);
    const months = ageInMonths % 12;
    return months > 0 ? `${years} an${years > 1 ? 's' : ''} ${months} mois` : `${years} an${years > 1 ? 's' : ''}`;
  }
}

function calculateVaccinationProgress(vaccinations: VaccinationRecord[]) {
  const total = vaccinations.length;
  const completed = vaccinations.filter(v => v.status === "done").length;
  const scheduled = vaccinations.filter(v => v.status === "scheduled").length;
  const overdue = vaccinations.filter(v => v.status === "overdue").length;
  const planned = vaccinations.filter(v => v.status === "planned").length;
  
  return {
    total,
    completed,
    scheduled,
    overdue,
    planned,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}

/* -------------------------------------------------------------------------- */
/* 📊 OBTENIR LE TAUX DE COMPLÉTION VACCINAL D'UN ENFANT                      */
/* -------------------------------------------------------------------------- */
export const getChildCompletionRate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "ID enfant manquant" });
    }

    const completionData = await calculateChildCompletionRate(id);

    if (completionData.error) {
      return res.status(404).json({ error: completionData.error });
    }

    res.json({
      success: true,
      data: completionData,
    });
  } catch (error) {
    console.error("❌ Erreur récupération taux complétion:", error);
    res.status(500).json({ error: "Erreur serveur", details: error });
  }
};
