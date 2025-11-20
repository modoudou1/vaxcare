import { Request, Response } from "express";
import Child from "../models/Child";
import Vaccination from "../models/Vaccination";
import Appointment from "../models/Appointment";
import User from "../models/User";
import bcrypt from "bcryptjs";

/**
 * Demander un export des données (RGPD)
 */
export const requestDataExport = async (req: Request, res: Response) => {
  try {
    const { parentPhone } = req.body;

    if (!parentPhone) {
      return res.status(400).json({
        success: false,
        message: "Numéro de téléphone parent requis",
      });
    }

    // Normaliser le numéro
    const normalizedPhone = parentPhone.replace(/\s/g, "");

    // Trouver tous les enfants du parent
    const children = await Child.find({
      "parentInfo.parentPhone": normalizedPhone,
    }).lean();

    if (!children || children.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Aucun enfant trouvé pour ce parent",
      });
    }

    // Collecter toutes les données
    const childIds = children.map((c) => c._id);

    const vaccinations = await Vaccination.find({
      child: { $in: childIds },
    }).lean();

    const appointments = await Appointment.find({
      child: { $in: childIds },
    }).lean();

    // Préparer le package de données
    const dataPackage = {
      exportDate: new Date().toISOString(),
      parentInfo: {
        phone: normalizedPhone,
        name: children[0]?.parentInfo?.parentName || "N/A",
        email: children[0]?.parentInfo?.parentEmail || "N/A",
      },
      children: children.map((child: any) => ({
        id: child._id,
        name: `${child.firstName || ""} ${child.lastName || ""}`.trim() || child.name || "N/A",
        firstName: child.firstName || "",
        lastName: child.lastName || "",
        gender: child.gender,
        birthDate: child.birthDate,
        region: child.region || "N/A",
        healthCenter: child.healthCenter || "N/A",
        parentAccessCode: child.parentAccessCode || "N/A",
        status: child.status || "N/A",
        registeredAt: child.createdAt,
      })),
      vaccinations: vaccinations.map((v: any) => ({
        vaccine: v.vaccine?.toString() || "N/A",
        scheduledDate: v.scheduledDate,
        doneDate: v.doneDate,
        status: v.status,
        doseNumber: v.doseNumber,
        healthCenter: v.healthCenter,
      })),
      appointments: appointments.map((a: any) => ({
        child: a.child?.toString() || "N/A",
        date: a.date,
        status: a.status,
        healthCenter: a.healthCenter,
        agent: a.agent?.toString() || "N/A",
      })),
      statistics: {
        totalChildren: children.length,
        totalVaccinations: vaccinations.length,
        totalAppointments: appointments.length,
      },
    };

    // TODO: En production, envoyer par email ou générer PDF
    // Pour l'instant, retourner les données directement
    console.log(`📦 Export de données demandé pour ${normalizedPhone}`);
    console.log(`📊 ${children.length} enfant(s), ${vaccinations.length} vaccinations, ${appointments.length} rendez-vous`);

    res.status(200).json({
      success: true,
      message: "Export de données préparé avec succès",
      data: dataPackage,
    });
  } catch (error) {
    console.error("Erreur export données:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'export des données",
    });
  }
};

/**
 * Supprimer le compte parent et toutes ses données
 */
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Non autorisé",
      });
    }

    // Récupérer l'utilisateur (qui est en fait un Child avec type parent)
    const child = await Child.findById(userId);

    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Compte non trouvé",
      });
    }

    const parentPhone = child.parentInfo?.parentPhone;

    if (!parentPhone) {
      return res.status(400).json({
        success: false,
        message: "Numéro de téléphone parent manquant",
      });
    }

    // Trouver TOUS les enfants de ce parent
    const allChildren = await Child.find({
      "parentInfo.parentPhone": parentPhone,
    });

    const childIds = allChildren.map((c) => c._id);

    console.log(`🗑️ SUPPRESSION COMPTE: Parent ${parentPhone}`);
    console.log(`   → ${childIds.length} enfant(s) à supprimer`);

    // Supprimer toutes les vaccinations associées
    const deletedVaccinations = await Vaccination.deleteMany({
      child: { $in: childIds },
    });
    console.log(`   → ${deletedVaccinations.deletedCount} vaccinations supprimées`);

    // Supprimer tous les rendez-vous associés
    const deletedAppointments = await Appointment.deleteMany({
      child: { $in: childIds },
    });
    console.log(`   → ${deletedAppointments.deletedCount} rendez-vous supprimés`);

    // Supprimer tous les enfants
    const deletedChildren = await Child.deleteMany({
      _id: { $in: childIds },
    });
    console.log(`   → ${deletedChildren.deletedCount} enfant(s) supprimé(s)`);

    // Log de sécurité
    console.log(`✅ Compte parent ${parentPhone} supprimé avec succès`);

    res.status(200).json({
      success: true,
      message: "Compte supprimé avec succès",
      deletedData: {
        children: deletedChildren.deletedCount,
        vaccinations: deletedVaccinations.deletedCount,
        appointments: deletedAppointments.deletedCount,
      },
    });
  } catch (error) {
    console.error("Erreur suppression compte:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression du compte",
    });
  }
};

/**
 * Obtenir la taille estimée du cache utilisateur
 */
export const getCacheSize = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Non autorisé",
      });
    }

    // Récupérer les données pour estimation
    const child = await Child.findById(userId);

    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Compte non trouvé",
      });
    }

    const parentPhone = child.parentInfo?.parentPhone;

    if (!parentPhone) {
      return res.status(400).json({
        success: false,
        message: "Numéro de téléphone parent manquant",
      });
    }

    // Estimer la taille des données en cache
    // Note: Dans une vraie app, on interrogerait le cache Redis ou autre
    const children = await Child.find({
      "parentInfo.parentPhone": parentPhone,
    });

    const childIds = children.map((c) => c._id);

    const vaccinationCount = await Vaccination.countDocuments({
      child: { $in: childIds },
    });

    const appointmentCount = await Appointment.countDocuments({
      child: { $in: childIds },
    });

    // Estimation simple (en KB)
    // Chaque enfant ~5KB, vaccination ~2KB, rendez-vous ~2KB
    const estimatedSize =
      children.length * 5 +
      vaccinationCount * 2 +
      appointmentCount * 2;

    res.status(200).json({
      success: true,
      cacheSize: estimatedSize, // en KB
      breakdown: {
        children: children.length,
        vaccinations: vaccinationCount,
        appointments: appointmentCount,
      },
    });
  } catch (error) {
    console.error("Erreur calcul cache:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors du calcul de la taille du cache",
    });
  }
};
