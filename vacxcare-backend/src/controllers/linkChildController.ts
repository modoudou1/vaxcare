import { Request, Response } from "express";
import mongoose from "mongoose";
import Child from "../models/Child";

// Fonction pour nettoyer et normaliser le numéro de téléphone
function normalizeSnPhone(input: string): string {
  const raw = String(input).trim();
  const only = raw.replace(/[^\d]/g, "");

  if (only.startsWith("00221")) return only.slice(5);
  if (!only.startsWith("221")) return "221" + only.slice(-9);

  return only;
}

// Fonction pour calculer l'âge
function formatAge(birthDate: Date): string {
  const now = new Date();
  const ageInMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + 
                     (now.getMonth() - birthDate.getMonth());
  
  if (ageInMonths < 12) {
    return `${ageInMonths} mois`;
  } else {
    const years = Math.floor(ageInMonths / 12);
    const months = ageInMonths % 12;
    return months > 0 ? `${years} an${years > 1 ? 's' : ''} ${months} mois` : `${years} an${years > 1 ? 's' : ''}`;
  }
}

export const linkChildByIdAndPhone = async (req: Request, res: Response) => {
  try {
    const { id, phone } = req.body;

    if (!id || !phone) {
      return res.status(400).json({ success: false, message: "ID et téléphone sont requis." });
    }

    const normalizedPhone = normalizeSnPhone(phone);

    // Validation de l'ID pour qu'il soit un ObjectId valide
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "ID invalide." });
    }

    // Recherche de l'enfant par ID et téléphone
    const child = await Child.findOne({
      _id: new mongoose.Types.ObjectId(id),  // On s'assure que l'ID est bien un ObjectId
      parentPhone: normalizedPhone,
    });

    if (!child) {
      return res.status(404).json({ success: false, message: "Aucun enfant trouvé pour cet ID et numéro de téléphone." });
    }

    // Mise à jour du centre de santé (si nécessaire)
    child.healthCenter = req.body.healthCenter || child.healthCenter;
    child.region = req.body.region || child.region;  // Ajout de la région si nécessaire

    await child.save();

    return res.json({
      success: true,
      message: "Enfant attaché avec succès au centre de santé.",
      child,
    });
  } catch (err: any) {
    console.error("❌ Erreur d'attachement de l'enfant:", err.message);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// Nouvelle fonction : Rechercher parent par téléphone et nom
export const searchParentByPhoneAndName = async (req: Request, res: Response) => {
  try {
    const { phone, parentName } = req.body;
    
    if (!phone) {
      return res.status(400).json({ success: false, message: "Le numéro de téléphone est requis" });
    }

    const normalizedPhone = normalizeSnPhone(phone);
    console.log(`🔍 Recherche parent: ${phone} / ${parentName}`);

    const query: any = { 
      $or: [
        { parentPhone: normalizedPhone },
        { 'parentInfo.parentPhone': { $regex: normalizedPhone, $options: 'i' } }
      ]
    };

    if (parentName) {
      query.$and = [
        { $or: query.$or },
        { 
          $or: [
            { parentName: { $regex: parentName, $options: 'i' } },
            { 'parentInfo.parentName': { $regex: parentName, $options: 'i' } }
          ]
        }
      ];
    }

    const children = await Child.find(query).lean();

    if (children.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Aucun parent trouvé avec ces informations" 
      });
    }

    // Récupérer les infos du parent depuis le premier enfant
    const firstChild: any = children[0];
    const parentInfo = {
      name: firstChild.parentInfo?.parentName || firstChild.parentName || 'Inconnu',
      phone: firstChild.parentInfo?.parentPhone || firstChild.parentPhone || '',
      email: firstChild.parentInfo?.parentEmail || '',
      childrenCount: children.length
    };

    res.json({ success: true, parent: parentInfo });
  } catch (err: any) {
    console.error("❌ Erreur recherche parent:", err);
    res.status(500).json({ success: false, message: "Erreur serveur", error: err.message });
  }
};

// Nouvelle fonction : Lister les enfants d'un parent
export const getChildrenByParentPhone = async (req: Request, res: Response) => {
  try {
    const { phone } = req.query;

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: "Le numéro de téléphone est requis" 
      });
    }

    const normalizedPhone = normalizeSnPhone(phone);
    console.log(`👶 Liste enfants du parent: ${phone}`);

    const children = await Child.find({ 
      $or: [
        { parentPhone: normalizedPhone },
        { 'parentInfo.parentPhone': { $regex: normalizedPhone, $options: 'i' } }
      ]
    })
    .select('firstName lastName birthDate gender sourceId healthCenter region parentInfo status')
    .lean();

    const Vaccination = require('../models/Vaccination').default;
    
    const enrichedChildren = await Promise.all(children.map(async (child: any) => {
      const birthDate = new Date(child.birthDate);
      const vaccinations = await Vaccination.find({ child: child._id }).lean();
      const doneCount = vaccinations.filter((v: any) => v.status === 'done').length;
      const totalCount = vaccinations.length;

      return {
        _id: child._id,
        id: child._id,
        firstName: child.firstName,
        lastName: child.lastName,
        name: `${child.firstName || ''} ${child.lastName || ''}`.trim(),
        birthDate: child.birthDate,
        gender: child.gender,
        sourceId: child.sourceId,
        ageFormatted: formatAge(birthDate),
        healthCenter: child.healthCenter || 'Non assigné',
        region: child.region || '',
        status: child.status || 'Non programmé',
        vaccinationProgress: {
          done: doneCount,
          total: totalCount,
          percentage: totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
        }
      };
    }));

    res.json({ success: true, children: enrichedChildren });
  } catch (err: any) {
    console.error("❌ Erreur liste enfants parent:", err);
    res.status(500).json({ success: false, message: "Erreur serveur", error: err.message });
  }
};

// Nouvelle fonction : Lier un enfant sélectionné
export const linkSelectedChild = async (req: Request, res: Response) => {
  try {
    const { childId, healthCenter, region } = req.body;

    if (!childId) {
      return res.status(400).json({ 
        success: false, 
        message: "ID de l'enfant requis" 
      });
    }

    console.log(`🔗 Liaison enfant ${childId} au centre ${healthCenter}`);

    const child: any = await Child.findById(childId);
    
    if (!child) {
      return res.status(404).json({ 
        success: false, 
        message: "Enfant introuvable" 
      });
    }

    // Mise à jour du centre et de la région
    if (healthCenter) child.healthCenter = healthCenter;
    if (region) child.region = region;
    
    await child.save();

    console.log(`✅ Enfant ${child.firstName} ${child.lastName} lié avec succès`);

    res.json({
      success: true,
      message: "Enfant lié avec succès",
      child: {
        _id: child._id,
        id: child._id,
        name: `${child.firstName || ''} ${child.lastName || ''}`.trim(),
        firstName: child.firstName,
        lastName: child.lastName,
        birthDate: child.birthDate,
        gender: child.gender,
        healthCenter: child.healthCenter,
        region: child.region
      }
    });
  } catch (err: any) {
    console.error("❌ Erreur liaison enfant:", err);
    res.status(500).json({ success: false, message: "Erreur serveur", error: err.message });
  }
};