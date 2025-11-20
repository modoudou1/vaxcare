import { Request, Response } from "express";
import AppointmentRequest from "../models/AppointmentRequest";
import Appointment from "../models/Appointment";
import Stock from "../models/Stock";
import Child from "../models/Child";
import HealthCenter from "../models/HealthCenter";
import User from "../models/User";
import Vaccine from "../models/Vaccine";
import VaccinationDays from "../models/VaccinationDays";
import { sendSocketNotification } from "../utils/socketManager";
import { sendNotification } from "../services/notification";
import { Types } from "mongoose";
import { IUser } from "../models/User";

/* -------------------------------------------------------------------------- */
/* 🔍 Rechercher les centres avec stock disponible                          */
/* -------------------------------------------------------------------------- */
export const searchAvailableCenters = async (req: Request, res: Response) => {
  try {
    const { vaccine, region } = req.query;

    if (!vaccine) {
      return res.status(400).json({ error: "Nom du vaccin requis" });
    }

    // 1. Chercher tous les stocks disponibles pour ce vaccin
    console.log(`🔍 Recherche stocks pour vaccin: ${vaccine}, région: ${region || 'toutes'}`);
    
    const availableStocks = await Stock.find({
      vaccine: (vaccine as string).toUpperCase(),
      quantity: { $gt: 0 }, // Stock > 0
      expirationDate: { $gt: new Date() }, // Non expiré
      ...(region && { region: region }), // Filtrer par région si fournie
    })
      .populate("createdBy", "name agentLevel healthCenter region")
      .sort({ quantity: -1 }); // Trier par quantité décroissante

    console.log(`✅ ${availableStocks.length} stocks trouvés avec quantity > 0`);

    if (availableStocks.length === 0) {
      return res.json({
        success: true,
        centers: [],
        message: "Aucun centre avec stock disponible trouvé",
      });
    }

    // 2. Grouper par centre de santé et récupérer les infos du centre
    const centersMap = new Map();

    for (const stock of availableStocks) {
      const centerName = stock.healthCenter;
      if (!centerName) continue;

      console.log(`🔍 Traitement stock - Centre: ${centerName}, Quantity: ${stock.quantity}, Lot: ${stock.batchNumber}`);

      // Chercher les infos du centre de santé
      const centerInfo = await HealthCenter.findOne({ name: centerName });

      if (!centersMap.has(centerName)) {
        // 3. Chercher les agents de ce centre pour avoir les jours de disponibilité
        const agents = await User.find({
          healthCenter: centerName,
          agentLevel: { $in: ["facility_admin", "facility_staff"] },
          isActive: true,
        }).select("name");

        // 4. Récupérer les vrais jours de vaccination des agents
        console.log(`🔍 Recherche jours de vaccination pour centre: ${centerName}`);
        const vaccinationDays = await VaccinationDays.find({
          healthCenter: centerName,
          isActive: true,
        });

        console.log(`✅ ${vaccinationDays.length} planning(s) trouvé(s) pour ${centerName}`);

        // 5. Combiner tous les jours disponibles des agents
        const allAvailableDays = new Set<string>();
        const dayMapping = {
          monday: "lundi",
          tuesday: "mardi", 
          wednesday: "mercredi",
          thursday: "jeudi",
          friday: "vendredi",
          saturday: "samedi",
          sunday: "dimanche"
        };

        for (const planning of vaccinationDays) {
          Object.entries(planning.vaccinationDays).forEach(([dayKey, isAvailable]) => {
            if (isAvailable && dayMapping[dayKey as keyof typeof dayMapping]) {
              allAvailableDays.add(dayMapping[dayKey as keyof typeof dayMapping]);
            }
          });
        }

        // Fallback si aucun planning défini
        if (allAvailableDays.size === 0) {
          console.log(`⚠️ Aucun planning trouvé pour ${centerName}, utilisation des jours par défaut`);
          ["lundi", "mardi", "mercredi", "jeudi", "vendredi"].forEach(day => 
            allAvailableDays.add(day)
          );
        }

        centersMap.set(centerName, {
          name: centerName,
          region: stock.region,
          district: stock.level === "district" ? centerName : centerInfo?.districtName,
          type: centerInfo?.type || "health_center",
          address: centerInfo?.address || "Adresse non disponible",
          hasStock: stock.quantity > 0, // ✅ Juste boolean au lieu de quantity exacte
          availableDays: Array.from(allAvailableDays),
          agents: agents.length,
          batches: [{
            batchNumber: stock.batchNumber,
            hasStock: stock.quantity > 0, // ✅ Boolean ici aussi
            expirationDate: stock.expirationDate,
          }],
        });
      } else {
        // Ajouter ce batch aux batches existants
        const center = centersMap.get(centerName);
        center.hasStock = center.hasStock || stock.quantity > 0; // ✅ Garder boolean
        center.batches.push({
          batchNumber: stock.batchNumber,
          hasStock: stock.quantity > 0, // ✅ Boolean ici aussi
          expirationDate: stock.expirationDate,
        });
      }
    }

    const centers = Array.from(centersMap.values());

    // Log final des centres trouvés
    console.log(`✅ Retour de ${centers.length} centres avec stock disponible`);
    for (const center of centers) {
      console.log(`📋 Centre: ${center.name}, hasStock: ${center.hasStock}, jours: [${center.availableDays.join(', ')}]`);
    }

    res.json({
      success: true,
      centers,
      totalCenters: centers.length,
      centersWithStock: centers.filter(c => c.hasStock).length,
    });
  } catch (error) {
    console.error("❌ Erreur recherche centres:", error);
    res.status(500).json({ error: "Erreur serveur lors de la recherche" });
  }
};

/* -------------------------------------------------------------------------- */
/* 📝 Créer une demande de rendez-vous                                       */
/* -------------------------------------------------------------------------- */
export const createAppointmentRequest = async (req: Request, res: Response) => {
  try {
    const { 
      childId, 
      vaccine, 
      healthCenter, 
      region, 
      district, 
      requestedDate, 
      requestMessage,
      urgencyLevel = "normal"
    } = req.body;

    // Validation des champs requis
    if (!childId || !vaccine || !healthCenter || !region || !requestedDate) {
      return res.status(400).json({ 
        error: "Champs requis: childId, vaccine, healthCenter, region, requestedDate" 
      });
    }

    // 1. Vérifier que l'enfant existe
    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({ error: "Enfant non trouvé" });
    }

    // Note: La vérification des jours de vaccination est temporairement désactivée
    // car le modèle User n'a pas encore de champ availableDays
    // TODO: Implémenter la vérification des jours de vaccination

    // 2. Vérifier la disponibilité du stock
    const stock = await Stock.findOne({
      vaccine: vaccine.toUpperCase(),
      healthCenter,
      quantity: { $gt: 0 },
      expirationDate: { $gt: new Date() },
    });

    if (!stock) {
      return res.status(400).json({ 
        error: "Stock non disponible",
        message: `Aucun stock de ${vaccine} disponible dans ce centre` 
      });
    }

    // 3. Vérifier qu'il n'y a pas déjà une demande en cours pour ce vaccin
    const existingRequest = await AppointmentRequest.findOne({
      child: childId,
      vaccine: vaccine.toUpperCase(),
      healthCenter,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({ 
        error: "Demande déjà en cours",
        message: "Vous avez déjà une demande en attente pour ce vaccin dans ce centre" 
      });
    }

    // 4. Créer la demande
    const appointmentRequest = new AppointmentRequest({
      child: childId,
      vaccine: vaccine.toUpperCase(),
      parentPhone: child.parentInfo?.parentPhone,
      healthCenter,
      region,
      district,
      requestedDate: new Date(requestedDate),
      requestMessage,
      urgencyLevel,
      stockVerified: true,
      availableDoses: stock.quantity,
    });

    await appointmentRequest.save();

    // 5. Notifier les agents du centre
    const agents = await User.find({
      healthCenter,
      agentLevel: { $in: ["facility_admin", "facility_staff"] },
      isActive: true,
    });

    const agentRooms = agents.map(agent => `agent_${agent._id}`);

    // 5. Créer notification temps réel
    const notification = {
      title: "Nouvelle demande de RDV",
      message: `Demande de ${vaccine} pour ${child.firstName} ${child.lastName}`,
      type: "appointment_request",
      targetRoles: ["agent"],
      metadata: {
        requestId: appointmentRequest._id,
        childName: `${child.firstName} ${child.lastName}`,
        vaccine,
        requestedDate: requestedDate,
        urgencyLevel,
      },
    };

    // Note: Socket.io notifications temporairement désactivées
    // TODO: Étendre le type Request pour inclure io
    // if (req.io) {
    //   sendSocketNotification(req.io, agentRooms, notification);
    // }

    // 6. Envoyer SMS/WhatsApp aux agents (optionnel)
    for (const agent of agents as IUser[]) {
      if (agent.phone) {
        await sendNotification({
          to: agent.phone, // Utiliser 'to' au lieu de 'phone'
          message: `🔔 Nouvelle demande RDV: ${vaccine} pour ${child.firstName} ${child.lastName}. Consultez votre dashboard pour répondre.`,
          channel: "whatsapp",
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Demande de rendez-vous créée avec succès",
      request: appointmentRequest,
    });
  } catch (error) {
    console.error("❌ Erreur création demande:", error);
    res.status(500).json({ error: "Erreur serveur lors de la création" });
  }
};

/* -------------------------------------------------------------------------- */
/* 📋 Récupérer les demandes reçues (pour agents)                           */
/* -------------------------------------------------------------------------- */
export const getIncomingRequests = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    console.log("🔍 getIncomingRequests - User info:", {
      id: user.id,
      role: user.role,
      healthCenter: user.healthCenter,
    });

    const { status = "all" } = req.query;

    // Construire le filtre
    const filter: any = {
      healthCenter: user.healthCenter,
    };

    if (status !== "all") {
      filter.status = status;
    }

    // Récupérer les demandes
    const requests = await AppointmentRequest.find(filter)
      .populate("child", "prenom nom parentInfo")
      .populate("respondedBy", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests,
      total: requests.length,
    });
  } catch (error) {
    console.error("❌ Erreur récupération demandes:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

/* -------------------------------------------------------------------------- */
/* ✅ Accepter une demande de rendez-vous                                    */
/* -------------------------------------------------------------------------- */
export const acceptAppointmentRequest = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { confirmedDate, responseMessage } = req.body;
    const user = req.user;

    console.log("🔍 acceptAppointmentRequest - Params:", {
      requestId,
      confirmedDate,
      responseMessage,
      userId: user?.id,
      userRole: user?.role,
      userHealthCenter: user?.healthCenter,
    });

    if (!user) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    // 1. Trouver la demande
    console.log("🔍 Recherche de la demande:", requestId);
    const request = await AppointmentRequest.findById(requestId)
      .populate("child");

    console.log("🔍 Demande trouvée:", {
      id: request?._id,
      status: request?.status,
      healthCenter: request?.healthCenter,
      vaccine: request?.vaccine,
    });

    if (!request) {
      console.log("❌ Demande non trouvée");
      return res.status(404).json({ error: "Demande non trouvée" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "Cette demande a déjà été traitée" });
    }

    // 2. Vérifier que l'agent appartient au bon centre
    if (request.healthCenter !== user.healthCenter) {
      return res.status(403).json({ error: "Vous ne pouvez pas traiter cette demande" });
    }

    // 3. Vérifier encore une fois le stock
    const stock = await Stock.findOne({
      vaccine: request.vaccine,
      healthCenter: request.healthCenter,
      quantity: { $gt: 0 },
    });

    if (!stock) {
      return res.status(400).json({ 
        error: "Stock épuisé",
        message: "Le stock n'est plus disponible pour ce vaccin" 
      });
    }

    // 4. Trouver l'ObjectId du vaccin
    console.log("🔍 Recherche du vaccin:", request.vaccine);
    const vaccine = await Vaccine.findOne({ name: request.vaccine.toUpperCase() });
    
    if (!vaccine) {
      console.log("❌ Vaccin non trouvé:", request.vaccine);
      return res.status(400).json({ 
        error: "Vaccin non trouvé",
        message: `Le vaccin ${request.vaccine} n'existe pas dans la base de données` 
      });
    }

    console.log("✅ Vaccin trouvé:", vaccine._id);

    // 5. Créer le rendez-vous confirmé
    const appointment = new Appointment({
      child: request.child._id,
      vaccine: vaccine._id, // Utiliser l'ObjectId du vaccin
      healthCenter: request.healthCenter,
      region: request.region,
      district: request.district,
      agent: user._id,
      requestedBy: request.child._id, // Parent qui a fait la demande
      date: confirmedDate ? new Date(confirmedDate) : request.requestedDate,
      status: "confirmed",
      notes: responseMessage || "Rendez-vous confirmé suite à demande parent",
    });

    await appointment.save();

    // 6. Mettre à jour la demande
    request.status = "accepted";
    request.responseDate = new Date();
    request.responseMessage = responseMessage || "Demande acceptée";
    request.respondedBy = new Types.ObjectId(user._id);
    request.appointmentCreated = appointment._id as Types.ObjectId;
    await request.save();

    // 7. Notifier le parent
    const child = request.child as any;
    const notification = {
      title: "✅ Demande de rendez-vous acceptée",
      message: `Votre demande pour la vaccination ${request.vaccine} de ${child.firstName || child.prenom || "votre enfant"} a été acceptée. RDV le ${new Date(appointment.date).toLocaleDateString("fr-FR")}.`,
      type: "appointment_accepted",
      icon: "✅",
      data: {
        appointmentId: appointment._id,
        vaccine: request.vaccine,
        childName: `${child.firstName || child.prenom || ""} ${child.lastName || child.nom || ""}`.trim(),
        date: appointment.date,
        healthCenter: request.healthCenter,
      },
    };

    // Socket.io notification
    // Socket.io notification (temporairement désactivé - req.io pas dans le type Request)
    // if (req.io && child.parentInfo?.parentPhone) {
    //   const parentRooms = [`parent_${child.parentInfo.parentPhone}_child_${child._id}`];
    //   sendSocketNotification(req.io, parentRooms, notification);
    // }

    // SMS/WhatsApp notification
    if (child.parentInfo?.parentPhone) {
      await sendNotification({
        to: child.parentInfo?.parentPhone,
        message: notification.message,
        channel: "both",
      });
    }

    res.json({
      success: true,
      message: "Demande acceptée et rendez-vous créé",
      appointment,
      request,
    });
  } catch (error) {
    console.error("❌ Erreur acceptation demande:", error);
    console.error("❌ Stack trace:", (error as Error).stack);
    res.status(500).json({ 
      error: "Erreur serveur", 
      message: (error as Error).message,
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    });
  }
};

/* -------------------------------------------------------------------------- */
/* ❌ Refuser une demande de rendez-vous                                     */
/* -------------------------------------------------------------------------- */
export const rejectAppointmentRequest = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { responseMessage } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    if (!responseMessage) {
      return res.status(400).json({ error: "Motif de refus requis" });
    }

    // 1. Trouver la demande
    const request = await AppointmentRequest.findById(requestId)
      .populate("child");

    if (!request) {
      return res.status(404).json({ error: "Demande non trouvée" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "Cette demande a déjà été traitée" });
    }

    // 2. Vérifier que l'agent appartient au bon centre
    if (request.healthCenter !== user.healthCenter) {
      return res.status(403).json({ error: "Vous ne pouvez pas traiter cette demande" });
    }

    // 3. Mettre à jour la demande
    request.status = "rejected";
    request.responseDate = new Date();
    request.responseMessage = responseMessage;
    request.respondedBy = new Types.ObjectId(user._id);
    await request.save();

    // 4. Notifier le parent
    const child = request.child as any;
    const notification = {
      title: "❌ Demande de rendez-vous refusée",
      message: `Votre demande pour la vaccination ${request.vaccine} de ${child.firstName || child.prenom || "votre enfant"} a été refusée. Motif: ${responseMessage}`,
      type: "appointment_rejected",
      icon: "❌",
      data: {
        vaccine: request.vaccine,
        childName: `${child.firstName || child.prenom || ""} ${child.lastName || child.nom || ""}`.trim(),
        reason: responseMessage,
        healthCenter: request.healthCenter,
      },
    };

    // Socket.io notification
    // Socket.io notification (temporairement désactivé - req.io pas dans le type Request)
    // if (req.io && child.parentInfo?.parentPhone) {
    //   const parentRooms = [`parent_${child.parentInfo.parentPhone}_child_${child._id}`];
    //   sendSocketNotification(req.io, parentRooms, notification);
    // }

    // SMS/WhatsApp notification
    if (child.parentInfo?.parentPhone) {
      await sendNotification({
        to: child.parentInfo?.parentPhone,
        message: notification.message,
        channel: "both",
      });
    }

    res.json({
      success: true,
      message: "Demande refusée",
      request,
    });
  } catch (error) {
    console.error("❌ Erreur refus demande:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

/* -------------------------------------------------------------------------- */
/* 📱 Récupérer les demandes du parent (mobile)                             */
/* -------------------------------------------------------------------------- */
export const getParentRequests = async (req: Request, res: Response) => {
  try {
    const { childId } = req.params;

    const requests = await AppointmentRequest.find({ child: childId })
      .populate("respondedBy", "name")
      .populate("appointmentCreated", "date status")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("❌ Erreur récupération demandes parent:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};
