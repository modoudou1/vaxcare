import { Request, Response } from "express";
import Campaign, { IMedia } from "../models/Campaign";
import Notification from "../models/Notification";
import { sendSocketNotification } from "../utils/socketManager";

/* -------------------------------------------------------------------------- */
/* ➕ Créer une campagne (National → Parents, Agents, Régionaux)              */
/* -------------------------------------------------------------------------- */
export const createCampaign = async (req: Request, res: Response) => {
  try {
    console.log("📥 Données reçues pour création campagne:", req.body);
    
    const { 
      title, 
      startDate, 
      endDate, 
      description, 
      region,
      targetVaccine,
      targetAgeGroup,
      targetPopulation,
      status 
    } = req.body;
    const user = (req as any).user;
    const io = req.app.locals.io;

    console.log("👤 Utilisateur:", user?.id, user?.email);

    // Validation des champs requis
    if (!title || !startDate || !endDate) {
      console.error("❌ Validation échouée - champs manquants");
      return res.status(400).json({ 
        success: false,
        error: "Champs requis manquants", 
        details: "title, startDate et endDate sont obligatoires" 
      });
    }

    if (!user?.id) {
      console.error("❌ Utilisateur non authentifié");
      return res.status(401).json({ 
        success: false,
        error: "Non authentifié",
        details: "Utilisateur non trouvé dans la requête" 
      });
    }

    const campaignData = {
      title,
      description,
      startDate,
      endDate,
      region,
      targetVaccine,
      targetAgeGroup,
      targetPopulation,
      status: status || "planned",
      createdBy: user.id,
      medias: [],
    };

    console.log("📝 Données campagne à créer:", campaignData);

    const campaign = new Campaign(campaignData);

    await campaign.save();
    console.log("✅ Campagne sauvegardée:", campaign._id);

    const readableDate = new Date(startDate).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const message = `📢 Une nouvelle campagne ${title} débutera le ${readableDate}${
      region ? ` dans la région de ${region}` : ""
    }. Consultez les détails dans la section "Campagnes".`;

    const notif = await Notification.create({
      title: `Nouvelle campagne ${title}`,
      message,
      type: "campagne",
      targetRoles: ["parent", "agent", "regional"],
      icon: "📢",
      status: "info",
    });

    // Envoi Socket.io seulement si io est disponible
    if (io) {
      sendSocketNotification(io, ["parent", "agent", "regional"], {
        title: notif.title,
        message: notif.message,
        type: notif.type,
        icon: notif.icon,
        status: notif.status,
        createdAt: notif.createdAt,
      });
      console.log(`📡 Notification campagne envoyée : ${title}`);
    } else {
      console.warn("⚠️ Socket.io non disponible, notification non envoyée en temps réel");
    }

    res.status(201).json({
      success: true,
      message: "Campagne créée avec succès et notification envoyée.",
      campaign,
    });
  } catch (err: any) {
    console.error("❌ Erreur createCampaign:", err);
    res.status(500).json({ 
      success: false,
      error: "Erreur serveur", 
      message: err.message,
      details: err 
    });
  }
};

/* -------------------------------------------------------------------------- */
/* 📋 Liste des campagnes                                                    */
/* -------------------------------------------------------------------------- */
export const getCampaigns = async (_req: Request, res: Response) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json({ success: true, campaigns });
  } catch (err) {
    console.error("❌ Erreur getCampaigns:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

/* -------------------------------------------------------------------------- */
/* 📌 Détail d’une campagne                                                  */
/* -------------------------------------------------------------------------- */
export const getCampaignById = async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: "Campagne introuvable" });
    }
    res.json({ success: true, campaign });
  } catch (err) {
    console.error("❌ Erreur getCampaignById:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

/* -------------------------------------------------------------------------- */
/* ✏️ Modifier une campagne                                                  */
/* -------------------------------------------------------------------------- */
export const updateCampaign = async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!campaign) {
      return res.status(404).json({ error: "Campagne introuvable" });
    }

    res.json({ success: true, campaign });
  } catch (err) {
    console.error("❌ Erreur updateCampaign:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

/* -------------------------------------------------------------------------- */
/* ❌ Supprimer une campagne                                                 */
/* -------------------------------------------------------------------------- */
export const deleteCampaign = async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: "Campagne introuvable" });
    }

    res.json({ success: true, message: "Campagne supprimée avec succès." });
  } catch (err) {
    console.error("❌ Erreur deleteCampaign:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

/* -------------------------------------------------------------------------- */
/* ➕ Ajouter un média à une campagne                                        */
/* -------------------------------------------------------------------------- */
export const addMediaToCampaign = async (req: Request, res: Response) => {
  try {
    const { url, type } = req.body;
    if (!url || !type || !["video", "pdf"].includes(type)) {
      return res.status(400).json({ error: "URL et type (video|pdf) requis" });
    }

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: "Campagne introuvable" });
    }

    campaign.medias.push({ url, type });
    await campaign.save();

    res.json({ success: true, campaign });
  } catch (err) {
    console.error("❌ Erreur addMediaToCampaign:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

/* -------------------------------------------------------------------------- */
/* 🗑️ Supprimer un média d’une campagne                                      */
/* -------------------------------------------------------------------------- */
export const removeMediaFromCampaign = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL du média requise" });

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: "Campagne introuvable" });
    }

    campaign.medias = campaign.medias.filter((m: IMedia) => m.url !== url);
    await campaign.save();

    res.json({ success: true, campaign });
  } catch (err) {
    console.error("❌ Erreur removeMediaFromCampaign:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};