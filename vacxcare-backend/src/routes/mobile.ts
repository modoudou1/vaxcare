import express, { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { authMiddleware, roleCheck } from "../middleware/auth";
import Appointment from "../models/Appointment";
import Notification from "../models/Notification";
import Child from "../models/Child";
import Vaccination from "../models/Vaccination";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Mobile
 *   description: API mobile (parents & agents)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AppointmentRequest:
 *       type: object
 *       required:
 *         - child
 *         - vaccine
 *         - preferredDate
 *       properties:
 *         child: { type: string, description: ID de l’enfant }
 *         vaccine: { type: string, description: ID du vaccin }
 *         preferredDate: { type: string, format: date-time }
 *         notes: { type: string }
 *     Notification:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         message: { type: string }
 *         createdAt: { type: string, format: date-time }
 */

/**
 * @swagger
 * /api/mobile/appointments/request:
 *   post:
 *     summary: Demande de rendez-vous par un parent
 *     tags: [Mobile]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AppointmentRequest' }
 *     responses:
 *       201: { description: Demande envoyée }
 *       500: { description: Erreur serveur }
 */
router.post(
  "/appointments/request",
  authMiddleware,
  roleCheck("user"),
  async (req: any, res: Response) => {
    try {
      const { child, vaccine, preferredDate, notes } = req.body;

      const appointment = new Appointment({
        child,
        vaccine,
        date: preferredDate,
        notes,
        status: "pending",
        requestedBy: req.user.id,
      });

      await appointment.save();

      await Notification.create({
        user: req.user.id,
        message: `Nouvelle demande de rendez-vous pour l’enfant ID: ${child}`,
      });

      res
        .status(201)
        .json({ message: "Demande de rendez-vous envoyée", appointment });
    } catch (err) {
      res.status(500).json({ error: "Erreur serveur", details: err });
    }
  }
);

/**
 * @swagger
 * /api/mobile/appointments/{id}/confirm:
 *   put:
 *     summary: Confirmation d’un rendez-vous par un agent
 *     tags: [Mobile]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date: { type: string, format: date-time }
 *     responses:
 *       200: { description: Rendez-vous confirmé }
 *       404: { description: Rendez-vous introuvable }
 */
router.put(
  "/appointments/:id/confirm",
  authMiddleware,
  roleCheck("agent"),
  async (req: any, res: Response) => {
    try {
      const { date } = req.body;

      const appointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        { date, status: "confirmed", agent: req.user.id },
        { new: true }
      )
        .populate<{ child: { name: string } }>("child", "name")
        .populate("requestedBy", "email");

      if (!appointment) {
        return res.status(404).json({ error: "Rendez-vous introuvable" });
      }

      await Notification.create({
        user: (appointment as any).requestedBy?._id,
        message: `Votre rendez-vous pour ${
          (appointment as any).child?.name
        } est confirmé`,
      });

      res.json({ message: "Rendez-vous confirmé", appointment });
    } catch (err) {
      res.status(500).json({ error: "Erreur serveur", details: err });
    }
  }
);

/**
 * @swagger
 * /api/mobile/appointments:
 *   get:
 *     summary: Lister les rendez-vous d’un parent avec filtre
 *     tags: [Mobile]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, upcoming, past]
 *     responses:
 *       200: { description: Liste filtrée }
 */
router.get(
  "/appointments",
  authMiddleware,
  roleCheck("user"),
  async (req: any, res: Response) => {
    try {
      const { status } = req.query;
      let filter: any = { requestedBy: req.user.id };
      const now = new Date();

      if (status === "pending") filter.status = "pending";
      if (status === "confirmed") filter.status = "confirmed";
      if (status === "upcoming")
        filter = { ...filter, status: "confirmed", date: { $gte: now } };
      if (status === "past")
        filter = { ...filter, status: "confirmed", date: { $lt: now } };

      const appointments = await Appointment.find(filter)
        .populate<{ child: { name: string } }>("child", "name")
        .populate("vaccine", "name")
        .sort({ date: 1 });

      res.json({ message: "Rendez-vous filtrés", data: appointments });
    } catch (err) {
      res.status(500).json({ error: "Erreur serveur", details: err });
    }
  }
);

/**
 * @swagger
 * /api/mobile/notifications:
 *   get:
 *     summary: Récupérer les notifications d’un parent
 *     tags: [Mobile]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Liste des notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Notification' }
 */
router.get(
  "/notifications",
  authMiddleware,
  roleCheck("user"),
  async (req: any, res: Response) => {
    try {
      const notifications = await Notification.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .limit(20);

      res.json({ message: "Notifications du parent", data: notifications });
    } catch (err) {
      res.status(500).json({ error: "Erreur serveur", details: err });
    }
  }
);

// ==================== ROUTES POUR ENFANTS ====================

/**
 * @swagger
 * /api/mobile/parent-link-auth:
 *   post:
 *     summary: Authentification parent avec ID enfant et téléphone
 *     tags: [Mobile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               childId: { type: string }
 *               parentPhone: { type: string }
 *     responses:
 *       200: { description: Authentification réussie }
 *       404: { description: Enfant non trouvé }
 */
// 🔒 Limiteur simple pour éviter l'abus sur les endpoints d'auth mobile
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/parent-link-auth", authLimiter, async (req: any, res: Response) => {
  try {
    const { childId, parentPhone } = req.body;
    
    if (!childId || !parentPhone) {
      return res.status(400).json({ 
        success: false, 
        message: "Code enfant et téléphone requis" 
      });
    }

    // Normaliser le téléphone
    const phone = String(parentPhone).trim();
    const digits = phone.replace(/[^\d]/g, "");
    
    const variants = new Set<string>();
    variants.add(phone);
    if (digits) variants.add(digits);
    if (digits.length === 9) {
      variants.add(`221${digits}`);
      variants.add(`+221${digits}`);
      variants.add(`0${digits}`);
    }
    
    const variantArray = Array.from(variants);
    
    // 🔐 Chercher l'enfant soit par ID MongoDB soit par code d'accès parent
    let child: any;
    
    // Si childId est un code à 6 chiffres, chercher par parentAccessCode
    if (/^\d{6}$/.test(childId)) {
      child = await Child.findOne({
        parentAccessCode: childId,
        $or: [
          { parentPhone: { $in: variantArray } },
          { 'parentInfo.parentPhone': { $in: variantArray } },
        ],
      }).lean();
      
      if (child) {
        console.log("✅ Enfant trouvé avec le code d'accès:", childId);
      }
    } else {
      // Sinon, chercher par ID MongoDB (ancien format)
      child = await Child.findOne({
        _id: childId,
        $or: [
          { parentPhone: { $in: variantArray } },
          { 'parentInfo.parentPhone': { $in: variantArray } },
        ],
      }).lean();
      
      if (child) {
        console.log("✅ Enfant trouvé avec l'ID MongoDB:", childId);
      }
    }

    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Enfant non trouvé avec ces informations"
      });
    }

    // 🔐 Générer un JWT pour le parent
    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET || "monSuperSecret";
    
    const tokenPayload = {
      id: child._id.toString(),
      childId: child._id.toString(),
      role: "user", // Role parent pour les notifications
      phone: child.parentPhone || child.parentInfo?.parentPhone,
      phoneNumber: child.parentPhone || child.parentInfo?.parentPhone,
      type: "parent",
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });

    console.log("✅ Token JWT généré pour parent:", child.parentPhone);
    console.log("🔑 JWT_SECRET utilisé:", JWT_SECRET === process.env.JWT_SECRET ? "depuis .env" : "fallback");
    console.log("📦 Token payload:", tokenPayload);
    
    const finalParentPhone = child.parentPhone || child.parentInfo?.parentPhone;
    console.log("📞 ParentPhone final:", finalParentPhone);
    console.log("📋 Child complet:", {
      _id: child._id,
      name: child.name,
      parentPhone: child.parentPhone,
      parentInfo: child.parentInfo
    });

    res.json({
      success: true,
      token, // 🔑 Token JWT ajouté
      hasPin: !!child.parentInfo?.parentPin, // 🔐 Indique si le parent a déjà un PIN
      parentAccessCode: child.parentAccessCode, // 🎲 Code d'accès à 6 chiffres
      child: {
        id: child._id,
        parentAccessCode: child.parentAccessCode, // 🎲 Code d'accès facile à retenir
        name: child.name,
        firstName: child.firstName,
        lastName: child.lastName,
        birthDate: child.birthDate,
        gender: child.gender,
        parentName: child.parentName || child.parentInfo?.parentName,
        parentPhone: finalParentPhone,
        healthCenter: child.healthCenter,
        region: child.region,
      }
    });
  } catch (err: any) {
    console.error("❌ parent-link-auth error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur", 
      error: err.message 
    });
  }
});

/**
 * @swagger
 * /api/mobile/parent-pin/save:
 *   post:
 *     summary: Sauvegarder le PIN du parent
 *     tags: [Mobile]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               childId: { type: string }
 *               parentPhone: { type: string }
 *               pin: { type: string }
 *     responses:
 *       200: { description: PIN sauvegardé avec succès }
 *       400: { description: Données invalides }
 */
router.post("/parent-pin/save", authLimiter, authMiddleware, async (req: any, res: Response) => {
  try {
    const { childId, parentPhone, pin } = req.body;
    
    if (!childId || !parentPhone || !pin) {
      return res.status(400).json({ 
        success: false, 
        message: "childId, parentPhone et pin requis" 
      });
    }

    // Validation du PIN (4 chiffres)
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ 
        success: false, 
        message: "Le PIN doit contenir 4 chiffres" 
      });
    }

    // Normaliser le téléphone
    const phone = String(parentPhone).trim();
    const digits = phone.replace(/[^\d]/g, "");
    
    const variants = new Set<string>();
    variants.add(phone);
    if (digits) variants.add(digits);
    if (digits.length === 9) {
      variants.add(`221${digits}`);
      variants.add(`+221${digits}`);
      variants.add(`0${digits}`);
    }
    
    const variantArray = Array.from(variants);
    
    // Hasher le PIN avec bcrypt
    const bcrypt = require("bcryptjs");
    const hashedPin = await bcrypt.hash(pin, 10);
    
    const child: any = await Child.findOne({
      _id: childId,
      $or: [
        { parentPhone: { $in: variantArray } },
        { 'parentInfo.parentPhone': { $in: variantArray } },
      ],
    });

    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Enfant non trouvé avec ces informations"
      });
    }

    // Sauvegarder le PIN hashé
    child.parentInfo.parentPin = hashedPin;
    await child.save();

    console.log("✅ PIN sauvegardé pour le parent:", child.parentInfo.parentPhone);

    res.json({
      success: true,
      message: "PIN configuré avec succès"
    });
  } catch (err: any) {
    console.error("❌ Erreur sauvegarde PIN:", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur", 
      error: err.message 
    });
  }
});

/**
 * @swagger
 * /api/mobile/parent-pin/verify:
 *   post:
 *     summary: Vérifier le PIN du parent
 *     tags: [Mobile]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               childId: { type: string }
 *               parentPhone: { type: string }
 *               pin: { type: string }
 *     responses:
 *       200: { description: PIN vérifié avec succès }
 *       401: { description: PIN incorrect }
 */
router.post("/parent-pin/verify", authLimiter, authMiddleware, async (req: any, res: Response) => {
  try {
    const { childId, parentPhone, pin } = req.body;
    
    if (!childId || !parentPhone || !pin) {
      return res.status(400).json({ 
        success: false, 
        message: "childId, parentPhone et pin requis" 
      });
    }

    // Normaliser le téléphone
    const phone = String(parentPhone).trim();
    const digits = phone.replace(/[^\d]/g, "");
    
    const variants = new Set<string>();
    variants.add(phone);
    if (digits) variants.add(digits);
    if (digits.length === 9) {
      variants.add(`221${digits}`);
      variants.add(`+221${digits}`);
      variants.add(`0${digits}`);
    }
    
    const variantArray = Array.from(variants);
    
    const child: any = await Child.findOne({
      _id: childId,
      $or: [
        { parentPhone: { $in: variantArray } },
        { 'parentInfo.parentPhone': { $in: variantArray } },
      ],
    }).lean();

    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Enfant non trouvé avec ces informations"
      });
    }

    // Vérifier si le parent a un PIN configuré
    if (!child.parentInfo?.parentPin) {
      return res.status(401).json({
        success: false,
        message: "Aucun PIN configuré pour ce parent"
      });
    }

    // Comparer le PIN avec bcrypt
    const bcrypt = require("bcryptjs");
    const isValid = await bcrypt.compare(pin, child.parentInfo.parentPin);

    if (!isValid) {
      console.log("❌ PIN incorrect pour le parent:", child.parentInfo.parentPhone);
      return res.status(401).json({
        success: false,
        message: "Code PIN incorrect"
      });
    }

    console.log("✅ PIN vérifié pour le parent:", child.parentInfo.parentPhone);

    res.json({
      success: true,
      message: "PIN vérifié avec succès",
      child: {
        id: child._id,
        name: child.name,
        firstName: child.firstName,
        lastName: child.lastName,
        birthDate: child.birthDate,
        gender: child.gender,
        parentName: child.parentName || child.parentInfo?.parentName,
        parentPhone: child.parentPhone || child.parentInfo?.parentPhone,
        healthCenter: child.healthCenter,
        region: child.region,
      }
    });
  } catch (err: any) {
    console.error("❌ Erreur vérification PIN:", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur", 
      error: err.message 
    });
  }
});

/**
 * @swagger
 * /api/mobile/children/{id}:
 *   get:
 *     summary: Récupérer les informations d'un enfant
 *     tags: [Mobile]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Informations de l'enfant }
 *       404: { description: Enfant non trouvé }
 */
router.get("/children/:id", authMiddleware, async (req: any, res: Response) => {
  try {
    const childId = req.params.id;
    
    const child: any = await Child.findById(childId).lean();
    
    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Enfant non trouvé"
      });
    }

    // Retourner les informations de l'enfant
    res.json({
      success: true,
      child: {
        id: child._id,
        _id: child._id,
        name: child.name,
        firstName: child.firstName,
        lastName: child.lastName,
        birthDate: child.birthDate,
        dateOfBirth: child.birthDate,
        gender: child.gender,
        parentName: child.parentName || child.parentInfo?.parentName,
        parentPhone: child.parentPhone || child.parentInfo?.parentPhone,
        healthCenter: child.healthCenter,
        registrationCenter: child.healthCenter,
        region: child.region,
        parentInfo: child.parentInfo,
      }
    });
  } catch (err: any) {
    console.error("❌ Error getting child:", err);
    res.status(500).json({ 
      success: false,
      message: "Erreur serveur", 
      error: err.message 
    });
  }
});

/**
 * @swagger
 * /api/mobile/parent/children:
 *   get:
 *     summary: Récupérer tous les enfants d'un parent
 *     tags: [Mobile]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Liste des enfants }
 */
router.get("/parent/children", authMiddleware, async (req: any, res: Response) => {
  try {
    // Récupérer le téléphone du parent depuis le token
    const parentPhone = req.user?.phone || req.user?.phoneNumber;
    
    if (!parentPhone) {
      return res.status(400).json({
        success: false,
        message: "Numéro de téléphone parent non trouvé dans le token"
      });
    }

    // Normaliser le téléphone
    const phone = String(parentPhone).trim();
    const digits = phone.replace(/[^\d]/g, "");
    
    const variants = new Set<string>();
    variants.add(phone);
    if (digits) variants.add(digits);
    if (digits.length === 9) {
      variants.add(`221${digits}`);
      variants.add(`+221${digits}`);
      variants.add(`0${digits}`);
    }
    
    const variantArray = Array.from(variants);
    
    // Rechercher tous les enfants avec ce numéro de téléphone
    const children = await Child.find({
      $or: [
        { parentPhone: { $in: variantArray } },
        { 'parentInfo.parentPhone': { $in: variantArray } },
      ],
    }).lean();

    // Formater les résultats
    const formattedChildren = children.map((child: any) => ({
      id: child._id,
      _id: child._id,
      name: child.name,
      firstName: child.firstName,
      lastName: child.lastName,
      birthDate: child.birthDate,
      dateOfBirth: child.birthDate,
      gender: child.gender,
      parentName: child.parentName || child.parentInfo?.parentName,
      parentPhone: child.parentPhone || child.parentInfo?.parentPhone,
      healthCenter: child.healthCenter,
      registrationCenter: child.healthCenter,
      region: child.region,
    }));

    res.json({
      success: true,
      count: formattedChildren.length,
      children: formattedChildren
    });
  } catch (err: any) {
    console.error("❌ Error getting parent children:", err);
    res.status(500).json({ 
      success: false,
      message: "Erreur serveur", 
      error: err.message 
    });
  }
});

/**
 * @swagger
 * /api/mobile/children/{id}/stats:
 *   get:
 *     summary: Statistiques de vaccination d'un enfant
 *     tags: [Mobile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Statistiques }
 */
router.get("/children/:id/stats", async (req: any, res: Response) => {
  try {
    const childId = req.params.id;
    
    // Compter les vaccinations par statut
    const vaccinations = await Vaccination.find({ child: childId }).lean();
    
    const completedCount = vaccinations.filter((v: any) => v.status === 'done').length;
    const scheduledCount = vaccinations.filter((v: any) => v.status === 'scheduled').length;
    const missedCount = vaccinations.filter((v: any) => v.status === 'missed').length;
    const overdueCount = vaccinations.filter((v: any) => v.status === 'planned' || v.status === 'overdue').length;
    
    const stats = {
      totalVaccines: vaccinations.length,
      completedVaccines: completedCount,
      scheduledVaccines: scheduledCount,
      missedVaccines: missedCount,
      overdueVaccines: overdueCount,
      remainingVaccines: vaccinations.length - completedCount,
    };
    
    console.log(`📊 Stats enfant ${childId}:`, stats);
    
    res.json(stats);
  } catch (err: any) {
    console.error("❌ stats error:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

/**
 * @swagger
 * /api/mobile/children/{id}/vaccinations:
 *   get:
 *     summary: Liste des vaccinations d'un enfant
 *     tags: [Mobile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Liste des vaccinations }
 */
router.get("/children/:id/vaccinations", async (req: any, res: Response) => {
  try {
    const childId = req.params.id;
    const sinceStr = req.query.since as string | undefined;
    const limitParam = parseInt(req.query.limit as string) || undefined;
    const limit = limitParam && limitParam > 0 ? Math.min(limitParam, 50) : undefined;
    
    // Importer les modèles nécessaires
    const VaccineCalendar = require('../models/VaccineCalendar').default;
    const Child = require('../models/Child').default;
    
    // Récupérer l'enfant pour calculer son âge
    const child = await Child.findById(childId).lean();
    if (!child) {
      return res.status(404).json({ message: "Enfant non trouvé" });
    }
    
    // Calculer l'âge de l'enfant en mois
    const birthDate = new Date(child.birthDate);
    const now = new Date();
    const ageInMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + 
                       (now.getMonth() - birthDate.getMonth());
    
    const sinceFilter = sinceStr ? { $or: [
      { updatedAt: { $gte: new Date(sinceStr) } },
      { createdAt: { $gte: new Date(sinceStr) } },
    ] } : {};

    const vaccinations = await Vaccination.find({ child: childId, ...sinceFilter })
      .populate('vaccine', 'name description')
      .sort({ scheduledDate: 1 })
      .limit(limit || 0)
      .lean();
    
    // Enrichir chaque vaccination avec les données du calendrier vaccinal
    const enrichedVaccinations = await Promise.all(vaccinations.map(async (v: any) => {
      // Priorité à vaccineName (string) puis vaccine.name (populate)
      const vaccineName = v.vaccineName || v.vaccine?.name || 'Vaccin inconnu';
      
      // Rechercher dans le calendrier vaccinal
      const calendarEntry = await VaccineCalendar.findOne({
        vaccine: { $in: [vaccineName] }
      }).lean();
      
      let recommendedAge = 'Non spécifié';
      let dose = v.dose || (typeof v.doseNumber === 'number' && v.doseNumber > 0 ? `Dose ${v.doseNumber}` : '1 dose');
      
      if (calendarEntry) {
        // Formater l'âge recommandé
        if (calendarEntry.specificAge !== null && calendarEntry.specificAge !== undefined) {
          recommendedAge = `${calendarEntry.specificAge} ${calendarEntry.ageUnit === 'months' ? 'mois' : calendarEntry.ageUnit === 'weeks' ? 'semaines' : 'ans'}`;
        } else if (calendarEntry.minAge !== null && calendarEntry.maxAge !== null) {
          recommendedAge = `${calendarEntry.minAge}-${calendarEntry.maxAge} ${calendarEntry.ageUnit === 'months' ? 'mois' : calendarEntry.ageUnit === 'weeks' ? 'semaines' : 'ans'}`;
        } else if (calendarEntry.minAge !== null) {
          recommendedAge = `À partir de ${calendarEntry.minAge} ${calendarEntry.ageUnit === 'months' ? 'mois' : calendarEntry.ageUnit === 'weeks' ? 'semaines' : 'ans'}`;
        }
        
        dose = calendarEntry.dose || dose;
      }
      
      return {
        ...v,
        vaccineName: vaccineName,
        name: vaccineName,
        recommendedAge,
        dose,
        doseNumber: typeof v.doseNumber === 'number' ? v.doseNumber : undefined,
        status: v.status,
        scheduledDate: v.scheduledDate,
        doneDate: v.doneDate,
        administeredDate: v.doneDate,
        healthCenter: v.healthCenter,
        description: calendarEntry?.description || v.vaccine?.description || ''
      };
    }));
    
    console.log(`📋 ${enrichedVaccinations.length} vaccinations trouvées pour enfant ${childId} (âge: ${ageInMonths} mois)`);
    
    res.json({ serverTime: new Date().toISOString(), vaccinations: enrichedVaccinations });
  } catch (err: any) {
    console.error("❌ vaccinations error:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

/**
 * @swagger
 * /api/mobile/children/{id}/appointments:
 *   get:
 *     summary: Rendez-vous d'un enfant
 *     tags: [Mobile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Liste des rendez-vous }
 */
router.get("/children/:id/appointments", async (req: any, res: Response) => {
  try {
    const childId = req.params.id;
    const Appointment = require('../models/Appointment').default;
    const sinceStr = req.query.since as string | undefined;
    const limitParam = parseInt(req.query.limit as string) || undefined;
    const limit = limitParam && limitParam > 0 ? Math.min(limitParam, 50) : undefined;
    
    // 📅 Récupérer les VACCINATIONS (rendez-vous principaux)
    const sinceFilter = sinceStr ? { $or: [
      { updatedAt: { $gte: new Date(sinceStr) } },
      { createdAt: { $gte: new Date(sinceStr) } },
    ] } : {};

    const vaccinations = await Vaccination.find({ child: childId, ...sinceFilter })
      .populate('vaccine', 'name')
      .lean();
    
    // 📅 Récupérer aussi les APPOINTMENTS séparés (si existants)
    const appointmentsRaw = await Appointment.find({ child: childId, ...sinceFilter })
      .populate('vaccine', 'name')
      .lean();
    
    // 🔄 Combiner et formater toutes les données
    const allAppointments: any[] = [];
    
    // Ajouter les vaccinations
    vaccinations.forEach((v: any) => {
      const date = v.scheduledDate || v.doneDate || new Date();
      const vName = v.vaccineName || v.vaccine?.name || 'Vaccin';
      allAppointments.push({
        _id: v._id,
        id: v._id,
        vaccineName: vName,
        title: vName,
        date: date.toISOString ? date.toISOString() : new Date(date).toISOString(),
        scheduledDate: v.scheduledDate,
        time: date ? new Date(date).toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : '09:00',
        status: v.status, // 'scheduled', 'done', 'missed', 'planned'
        location: v.healthCenter || 'Centre de santé',
        healthCenter: v.healthCenter,
        notes: v.notes,
        description: v.notes,
        doseNumber: typeof v.doseNumber === 'number' ? v.doseNumber : undefined,
        source: 'vaccination'
      });
    });
    
    // Ajouter les appointments
    appointmentsRaw.forEach((a: any) => {
      const date = a.date || new Date();
      allAppointments.push({
        _id: a._id,
        id: a._id,
        vaccineName: a.vaccine?.name || 'Rendez-vous',
        title: a.vaccine?.name || 'Rendez-vous',
        date: date.toISOString ? date.toISOString() : new Date(date).toISOString(),
        scheduledDate: a.date,
        time: date ? new Date(date).toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : '09:00',
        status: a.status === 'confirmed' ? 'scheduled' : a.status, // Normaliser
        location: a.healthCenter || 'Centre de santé',
        healthCenter: a.healthCenter,
        notes: a.notes,
        description: a.notes,
        source: 'appointment'
      });
    });
    
    // 🎯 TRI INTELLIGENT : Programmés en haut, Faits en bas
    allAppointments.sort((a, b) => {
      const statusA = a.status;
      const statusB = b.status;
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      // Priorité des statuts
      const getPriority = (status: string) => {
        switch (status) {
          case 'scheduled':
          case 'planned': return 1; // Programmés en premier
          case 'pending': return 2;
          case 'done': return 3;    // Faits ensuite
          case 'missed': return 4;  // Ratés
          case 'cancelled':
          case 'refused': return 5;
          default: return 6;
        }
      };
      
      const prioA = getPriority(statusA);
      const prioB = getPriority(statusB);
      
      if (prioA !== prioB) {
        return prioA - prioB; // Tri par priorité
      }
      
      // Si même priorité, tri par date
      if (statusA === 'scheduled' || statusA === 'planned' || statusA === 'pending') {
        return dateA.getTime() - dateB.getTime(); // Plus proche en premier
      }
      return dateB.getTime() - dateA.getTime(); // Plus récent en premier pour faits/ratés
    });
    if (typeof limit === 'number' && limit > 0) {
      allAppointments.splice(limit); // clip to limit
    }

    console.log(`📋 ${allAppointments.length} rendez-vous trouvés pour enfant ${childId}:`);
    console.log(`  - ${vaccinations.length} vaccinations`);
    console.log(`  - ${appointmentsRaw.length} appointments`);
    console.log(`  - Statuts: ${allAppointments.map(a => a.status).join(', ')}`);
    
    res.set('X-Server-Time', new Date().toISOString());
    res.json(allAppointments);
  } catch (err: any) {
    console.error("❌ appointments error:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

/**
 * @swagger
 * /api/mobile/children/{id}/calendar:
 *   get:
 *     summary: Calendrier vaccinal d'un enfant (timeline complète)
 *     tags: [Mobile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Calendrier vaccinal }
 */
router.get("/children/:id/calendar", async (req: any, res: Response) => {
  try {
    const childId = req.params.id;
    const VaccineCalendar = require('../models/VaccineCalendar').default;
    
    // Récupérer toutes les vaccinations de l'enfant
    const vaccinations = await Vaccination.find({ child: childId })
      .populate('vaccine', 'name description')
      .lean();
    
    // Formater pour le calendrier
    const merged = vaccinations.map((v: any) => {
      const vName = v.vaccineName || v.vaccine?.name || 'Vaccin inconnu';
      const date = v.scheduledDate || v.doneDate || v.createdAt;
      
      return {
        _id: v._id,
        name: vName,
        vaccineName: vName,
        date: date,
        status: v.status,
        dose: v.dose || '',
        healthCenter: v.healthCenter || 'Non spécifié',
        notes: v.notes || '',
        description: v.notes || ''
      };
    });
    
    res.json({ merged });
  } catch (err: any) {
    console.error("❌ calendar error:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

/**
 * @swagger
 * /api/mobile/children/{id}/notifications:
 *   get:
 *     summary: Notifications liées à un enfant
 *     tags: [Mobile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Liste des notifications }
 */
router.get("/children/:id/notifications", async (req: any, res: Response) => {
  try {
    const childId = req.params.id;
    const sinceStr = req.query.since as string | undefined;
    const limitParam = parseInt(req.query.limit as string) || 10;
    const limit = Math.min(Math.max(limitParam, 1), 50);
    // Notifications ciblées par enfant via metadata.childId (fallback générique si vide)
    const sinceFilter = sinceStr ? { $or: [
      { updatedAt: { $gte: new Date(sinceStr) } },
      { createdAt: { $gte: new Date(sinceStr) } },
    ] } : {};

    let notifications = await Notification.find({ "metadata.childId": childId, ...sinceFilter })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    if (notifications.length === 0) {
      notifications = await Notification.find({ ...sinceFilter })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    }

    res.set('X-Server-Time', new Date().toISOString());
    res.json(notifications);
  } catch (err: any) {
    console.error("❌ notifications error:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

/**
 * @swagger
 * /api/mobile/children/{id}/activity:
 *   get:
 *     summary: Activité récente d'un enfant
 *     tags: [Mobile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Activité récente }
 */
router.get("/children/:id/activity", async (req: any, res: Response) => {
  try {
    const childId = req.params.id;
    
    // Récupérer les activités récentes (vaccinations done + missed + rendez-vous)
    const recentDoneVaccinations: any[] = await Vaccination.find({ 
      child: childId,
      status: 'done'
    })
      .populate('vaccine', 'name')
      .sort({ administeredDate: -1 })
      .limit(5)
      .lean();
    
    const recentMissedVaccinations: any[] = await Vaccination.find({ 
      child: childId,
      status: 'missed'
    })
      .populate('vaccine', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    const recentAppointments: any[] = await Appointment.find({ 
      child: childId,
      status: { $in: ['confirmed', 'scheduled'] }
    })
      .populate('vaccine', 'name')
      .sort({ date: -1 })
      .limit(5)
      .lean();
    
    const activities = [
      ...recentDoneVaccinations.map((v: any) => ({
        type: 'vaccination',
        status: 'done',
        title: `Vaccin ${v.vaccineName || v.vaccine?.name || 'Inconnu'} administré`,
        date: v.administeredDate || v.doneDate || v.createdAt,
        createdAt: v.administeredDate || v.doneDate || v.createdAt,
      })),
      ...recentMissedVaccinations.map((v: any) => ({
        type: 'vaccination',
        status: 'missed',
        title: `Vaccin ${v.vaccineName || v.vaccine?.name || 'Inconnu'} raté`,
        date: v.createdAt,
        createdAt: v.createdAt,
      })),
      ...recentAppointments.map((a: any) => ({
        type: 'appointment',
        status: a.status,
        title: `Rendez-vous ${a.vaccine?.name || 'Inconnu'} programmé`,
        date: a.date,
        createdAt: a.createdAt || a.date,
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(activities.slice(0, 10));
  } catch (err: any) {
    console.error("❌ activity error:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

/**
 * @swagger
 * /api/mobile/parent-register:
 *   post:
 *     summary: Inscription d'un nouveau parent avec son enfant
 *     tags: [Mobile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parentName
 *               - parentPhone
 *               - childFirstName
 *               - childLastName
 *               - childBirthDate
 *               - childGender
 *             properties:
 *               parentName: { type: string }
 *               parentPhone: { type: string }
 *               parentEmail: { type: string }
 *               childFirstName: { type: string }
 *               childLastName: { type: string }
 *               childBirthDate: { type: string, format: date-time }
 *               childGender: { type: string, enum: [M, F] }
 *               address: { type: string }
 *     responses:
 *       201: { description: Inscription réussie }
 *       400: { description: Données invalides }
 */
router.post("/parent-register", authLimiter, async (req: any, res: Response) => {
  try {
    const {
      parentName,
      parentPhone,
      parentEmail,
      childFirstName,
      childLastName,
      childBirthDate,
      childGender,
      address,
    } = req.body;

    // Validation des champs requis
    if (!parentName || !parentPhone || !childFirstName || !childLastName || !childBirthDate || !childGender) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs obligatoires doivent être remplis"
      });
    }

    console.log("📝 Données reçues pour inscription parent:", {
      parentName,
      parentPhone,
      childFirstName,
      childLastName,
      childBirthDate,
      childGender,
      address: address ? "fournie" : "non fournie"
    });

    // Créer l'enfant avec les informations parent
    const child: any = await Child.create({
      firstName: childFirstName.trim(),
      lastName: childLastName.trim(),
      name: `${childFirstName.trim()} ${childLastName.trim()}`,
      birthDate: new Date(childBirthDate),
      gender: childGender,
      parentInfo: {
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        parentEmail: parentEmail?.trim() || undefined,
      },
      parentName: parentName.trim(), // Compatibilité legacy
      parentPhone: parentPhone.trim(), // Compatibilité legacy
      address: address?.trim() || undefined,
      // region et healthCenter omis - l'enfant sera lié par un agent plus tard
      status: "Non programmé",
      // createdBy omis - parent qui s'inscrit lui-même
    });

    console.log("✅ Enfant créé par inscription parent:", child._id);

    // Envoyer le code d'accès par WhatsApp + SMS (non-bloquant)
    const accessCode = child.parentAccessCode || child._id.toString();

    if (parentPhone) {
      try {
        const { sendParentAccessCode } = await import("../services/notification");
        await sendParentAccessCode(
          parentPhone.trim(),
          parentName.trim(),
          `${childFirstName} ${childLastName}`.trim(),
          accessCode,
          "both" // WhatsApp + SMS
        );
        console.log("📱 Code d'accès envoyé via WhatsApp/SMS");
      } catch (notifError: any) {
        console.error("⚠️ Erreur envoi notification (non-bloquant):", notifError.message);
        // On continue quand même, l'inscription est réussie
      }
    }

    // Générer un JWT pour le parent
    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET || "monSuperSecret";

    const tokenPayload = {
      id: child._id.toString(),
      childId: child._id.toString(),
      role: "user",
      phone: parentPhone.trim(),
      phoneNumber: parentPhone.trim(),
      type: "parent",
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });

    res.status(201).json({
      success: true,
      message: "Inscription réussie",
      token,
      child: {
        _id: child._id,
        id: child._id,
        firstName: child.firstName,
        lastName: child.lastName,
        name: child.name,
        birthDate: child.birthDate,
        gender: child.gender,
        parentName: child.parentInfo.parentName,
        parentPhone: child.parentInfo.parentPhone,
        region: child.region || null,
        healthCenter: child.healthCenter || null,
      }
    });
  } catch (err: any) {
    console.error("❌ Erreur inscription parent:", err);
    console.error("❌ Stack trace:", err.stack);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de l'inscription",
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

/**
 * @swagger
 * /api/mobile/children/{id}/mark-vaccines-done:
 *   post:
 *     summary: Marquer des vaccins comme déjà faits pour un enfant existant
 *     tags: [Mobile]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vaccines: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: Vaccins marqués comme faits }
 *       404: { description: Enfant non trouvé }
 */
router.post("/children/:id/mark-vaccines-done", authMiddleware, async (req: any, res: Response) => {
  try {
    const childId = req.params.id;
    const { vaccines } = req.body;

    if (!vaccines || !Array.isArray(vaccines)) {
      return res.status(400).json({
        success: false,
        message: "Liste de vaccins requise"
      });
    }

    // Vérifier que l'enfant existe
    const child: any = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Enfant non trouvé"
      });
    }

    console.log(`📋 Marquage de ${vaccines.length} vaccins comme faits pour l'enfant ${childId}`);

    // Charger le calendrier vaccinal pour obtenir les détails
    const VaccineCalendar = require('../models/VaccineCalendar').default;
    
    // Calculer l'âge de l'enfant en mois
    const now = new Date();
    const birthDate = new Date(child.birthDate);
    const ageInMonths = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    
    console.log(`👶 Âge de l'enfant: ${ageInMonths} mois`);
    
    // Récupérer TOUS les vaccins jusqu'à l'âge de l'enfant
    const allCalendar: any[] = await VaccineCalendar.find({}).lean();
    
    // Filtrer les vaccins pertinents selon l'âge
    const relevantCalendar = allCalendar.filter((entry: any) => {
      let vaccineAgeInMonths = 0;
      
      if (entry.specificAge != null) {
        const age = entry.specificAge;
        if (entry.ageUnit === 'months') {
          vaccineAgeInMonths = age;
        } else if (entry.ageUnit === 'weeks') {
          vaccineAgeInMonths = age / 4.33;
        } else if (entry.ageUnit === 'years') {
          vaccineAgeInMonths = age * 12;
        }
      } else if (entry.minAge != null) {
        const age = entry.minAge;
        if (entry.ageUnit === 'months') {
          vaccineAgeInMonths = age;
        } else if (entry.ageUnit === 'weeks') {
          vaccineAgeInMonths = age / 4.33;
        } else if (entry.ageUnit === 'years') {
          vaccineAgeInMonths = age * 12;
        }
      }
      
      return vaccineAgeInMonths <= ageInMonths;
    });
    
    console.log(`📅 Vaccins pertinents trouvés: ${relevantCalendar.length} périodes`);
    
    // Créer un Set des vaccins sélectionnés pour recherche rapide
    const selectedVaccineKeys = new Set(vaccines);
    
    const vaccinationsToCreate: any[] = [];
    let doneCount = 0;
    let missedCount = 0;

    // Parcourir TOUS les vaccins pertinents
    for (const calendarEntry of relevantCalendar) {
      const calendarId = calendarEntry._id.toString();
      
      // Pour chaque vaccin dans cette entrée du calendrier
      for (const vaccineName of calendarEntry.vaccine) {
        const vaccineKey = `${calendarId}_${vaccineName}`;
        
        // Déterminer le statut: "done" si sélectionné, "missed" sinon
        const isSelected = selectedVaccineKeys.has(vaccineKey);
        const status = isSelected ? "done" : "missed";
        
        const vaccination: any = {
          child: childId,
          vaccineName: vaccineName,
          dose: calendarEntry.dose,
          status: status,
          healthCenter: child.healthCenter || "Non spécifié",
        };
        
        if (isSelected) {
          // Vaccin fait avant inscription
          vaccination.doneDate = new Date();
          vaccination.administeredDate = new Date();
          vaccination.notes = "Vaccin déjà fait avant inscription";
          doneCount++;
        } else {
          // Vaccin raté (non fait)
          vaccination.notes = "Vaccin non fait lors de l'inscription";
          missedCount++;
        }
        
        vaccinationsToCreate.push(vaccination);
      }
    }

    // Créer toutes les vaccinations
    if (vaccinationsToCreate.length > 0) {
      await Vaccination.insertMany(vaccinationsToCreate);
      console.log(`✅ ${doneCount} vaccinations créées comme "done"`);
      console.log(`⚠️ ${missedCount} vaccinations créées comme "missed"`);
    }

    res.json({
      success: true,
      message: `${doneCount} vaccin(s) marqué(s) comme faits, ${missedCount} vaccin(s) marqué(s) comme ratés`,
      done: doneCount,
      missed: missedCount,
      total: vaccinationsToCreate.length
    });
  } catch (err: any) {
    console.error("❌ Erreur marquage vaccins:", err);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: err.message
    });
  }
});

export default router;
