import { Request, Response } from "express";
import mongoose from "mongoose";
import Stock from "../models/Stock";
import StockTransfer from "../models/StockTransfer";
import User from "../models/User";
import HealthCenter from "../models/HealthCenter";
import Notification from "../models/Notification";
import { sendSocketNotification } from "../utils/socketManager";
import { io } from "../server";

const toObjectId = (value: unknown): mongoose.Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return undefined;
};

const buildHealthCenterFilter = (value: unknown) => {
  const filters: (mongoose.Types.ObjectId | string)[] = [];
  const asObjectId = toObjectId(value);
  if (asObjectId) filters.push(asObjectId);
  if (typeof value === "string" && value.trim()) filters.push(value.trim());
  if (!filters.length) return undefined;
  return filters.length === 1 ? filters[0] : { $in: filters };
};

const normalizeHealthCenter = (value: unknown): string | undefined => {
  const asObjectId = toObjectId(value);
  if (asObjectId) return asObjectId.toString();
  if (typeof value === "string") return value;
  return undefined;
};

const sameHealthCenter = (a: unknown, b: unknown): boolean => {
  const normA = normalizeHealthCenter(a);
  const normB = normalizeHealthCenter(b);
  return !!normA && !!normB && normA === normB;
};

const resolveHealthCenterId = async (
  value: unknown
): Promise<mongoose.Types.ObjectId | undefined> => {
  const asObjectId = toObjectId(value);
  if (asObjectId) return asObjectId;
  if (typeof value === "string" && value.trim()) {
    const center = await HealthCenter.findOne({ name: value.trim() })
      .select("_id")
      .lean();
    return center?._id;
  }
  return undefined;
};

/* -------------------------------------------------------------------------- */
/* 📤 Transférer un stock (DIRECT - sans validation)                        */
/* -------------------------------------------------------------------------- */
export const initiateTransfer = async (req: Request, res: Response) => {
  try {
    const { stockId, quantity, toRegion, toHealthCenter } = req.body;
    const user = (req as any).user;
    const toHealthCenterId = await resolveHealthCenterId(toHealthCenter);

    console.log("\n🚀 ========= DÉBUT TRANSFERT =========");
    console.log("👤 User:", user.email, "Role:", user.role, "Region:", user.region || "N/A");
    console.log("📦 Body reçu:", JSON.stringify({ stockId, quantity, toRegion, toHealthCenter }));
    console.log("🔍 toRegion value:", typeof toRegion, `"${toRegion}"`);

    // Validation
    if (!stockId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: "Stock ID et quantité valide requis" });
    }

    // Récupérer le stock source
    const sourceStock = await Stock.findById(stockId);
    if (!sourceStock) {
      return res.status(404).json({ error: "Stock introuvable" });
    }

    // Vérifier quantité disponible
    if (sourceStock.quantity < quantity) {
      return res.status(400).json({
        error: `Quantité insuffisante (disponible: ${sourceStock.quantity})`,
      });
    }

    // Déterminer le niveau de destination
    let toLevel: "national" | "regional" | "district" | "agent" = "agent";
    let targetUser = null;
    let destinationHealthCenter = toHealthCenterId; // Variable modifiable

    if (user.role === "national") {
      // National → Regional
      if (!toRegion) {
        return res.status(400).json({ error: "Région de destination requise" });
      }
      toLevel = "regional";
      
      // Trouver le responsable régional
      const regionalUser = await User.findOne({ role: "regional", region: toRegion });
      if (regionalUser) {
        targetUser = regionalUser._id;
      }
    } else if (user.role === "regional") {
      // Regional → District
      if (!toHealthCenterId) {
        return res.status(400).json({ error: "District de destination requis" });
      }
      toLevel = "district";
      
      // Trouver le responsable du district
      const districtUser = await User.findOne({ 
        role: "district", 
        region: user.region,
        ...(toHealthCenterId ? { healthCenter: buildHealthCenterFilter(toHealthCenterId) } : {}),
      });
      if (districtUser) {
        targetUser = districtUser._id;
      }
    } else if (user.role === "district") {
      // District → Agent (structure de santé)
      if (!toHealthCenterId) {
        return res.status(400).json({ error: "Structure de santé de destination requise" });
      }
      toLevel = "agent";
      
      // Trouver un agent de cette structure
      const agentUser = await User.findOne({ 
        role: "agent", 
        region: user.region,
        ...(toHealthCenterId ? { healthCenter: buildHealthCenterFilter(toHealthCenterId) } : {}),
      });
      if (agentUser) {
        targetUser = agentUser._id;
      }
    } else if (user.role === "agent") {
      // Agent → Membre de l'équipe (autre agent du même centre)
      const { toUserId } = req.body;
      if (!toUserId) {
        return res.status(400).json({ error: "Membre de l'équipe de destination requis" });
      }
      toLevel = "agent";
      
      // Vérifier que le destinataire est bien un agent du même centre
      const teamMember = await User.findOne({ 
        _id: toUserId,
        role: "agent", 
        healthCenter: user.healthCenter 
      });
      
      if (!teamMember) {
        return res.status(400).json({ error: "Membre de l'équipe introuvable ou non autorisé" });
      }
      
      targetUser = teamMember._id;
      const agentCenterId = await resolveHealthCenterId(user.healthCenter);
      if (!agentCenterId) {
        return res.status(400).json({ error: "Votre centre de santé est introuvable" });
      }
      destinationHealthCenter = agentCenterId; // Même centre (ObjectId)
      console.log(`👥 Agent → Membre d'équipe: ${teamMember.firstName} ${teamMember.lastName} (ID: ${targetUser})`);
    } else {
      return res.status(403).json({ error: "Vous n'êtes pas autorisé à effectuer des transferts" });
    }

    console.log("✅ Niveau destination déterminé:", toLevel);
    console.log("✅ Région destination finale:", toRegion || user.region || "UNDEFINED");
    console.log("✅ HealthCenter destination:", destinationHealthCenter?.toString() || "AUCUN");

    // 🔥 TRANSFERT DIRECT : Décrémenter le stock source
    sourceStock.quantity -= quantity;
    await sourceStock.save();

    // 🔥 TRANSFERT DIRECT : Créer ou mettre à jour le stock destination IMMÉDIATEMENT
    const destinationQuery: any = {
      vaccine: sourceStock.vaccine,
      batchNumber: sourceStock.batchNumber,
      level: toLevel,
    };

    if (toRegion) {
      destinationQuery.region = toRegion;
    } else if (user.region) {
      destinationQuery.region = user.region;
    }
    
    if (destinationHealthCenter) {
      destinationQuery.healthCenter = destinationHealthCenter;
    }

    console.log("🔍 Recherche stock destination avec:", JSON.stringify(destinationQuery));

    let destinationStock = await Stock.findOne(destinationQuery);
    
    console.log("🔍 Stock destination trouvé?", destinationStock ? "OUI" : "NON");

    if (destinationStock) {
      // Stock existe déjà, on ajoute la quantité
      destinationStock.quantity += quantity;
      await destinationStock.save();
    } else {
      // Créer un nouveau stock destination
      const newStockData: any = {
        vaccine: sourceStock.vaccine,
        batchNumber: sourceStock.batchNumber,
        quantity,
        expirationDate: sourceStock.expirationDate,
        level: toLevel,
        region: toRegion || user.region,
        healthCenter: destinationHealthCenter,
        createdBy: user.id,
      };
      
      // 👥 Si transfert entre agents, assigner à l'utilisateur destinataire
      if (user.role === "agent" && targetUser) {
        newStockData.assignedTo = targetUser;
        console.log(`👤 Stock assigné à l'utilisateur: ${targetUser}`);
      }
      
      console.log("🔥 Création nouveau stock destination:", JSON.stringify(newStockData));
      
      destinationStock = await Stock.create(newStockData);
      
      console.log("✅ Stock créé avec ID:", destinationStock._id);
      console.log("✅ Détails complets:", JSON.stringify({
        _id: destinationStock._id,
        vaccine: destinationStock.vaccine,
        batchNumber: destinationStock.batchNumber,
        quantity: destinationStock.quantity,
        level: destinationStock.level,
        region: destinationStock.region,
        healthCenter: destinationStock.healthCenter,
        assignedTo: destinationStock.assignedTo
      }));
    }

    // Créer le transfert avec status "accepted" directement
    const transfer = await StockTransfer.create({
      stock: sourceStock._id,
      vaccine: sourceStock.vaccine,
      batchNumber: sourceStock.batchNumber,
      quantity,
      fromLevel: sourceStock.level,
      toLevel,
      fromRegion: sourceStock.region,
      fromHealthCenter: sourceStock.healthCenter,
      fromUser: user.id,
      toRegion: toRegion || user.region,
      toHealthCenter: destinationHealthCenter,
      toUser: targetUser,
      status: "accepted", // 🔥 Directement accepté
      transferDate: new Date(),
      acceptedDate: new Date(), // 🔥 Date d'acceptation immédiate
    });

    // Envoyer notification au destinataire
    const destination = destinationHealthCenter?.toString() || toRegion;
    const notif = await Notification.create({
      title: `📦 Transfert reçu`,
      message: `Vous avez reçu ${quantity} doses de ${sourceStock.vaccine} (lot ${sourceStock.batchNumber}).`,
      type: "stock",
      targetRoles: [toLevel],
      status: "success",
      icon: "📦",
    });

    sendSocketNotification(io, [toLevel], notif);

    res.status(201).json({
      message: "Transfert effectué avec succès",
      transfer,
      sourceStock,
      destinationStock,
    });
  } catch (err: any) {
    console.error("❌ Erreur initiateTransfer:", err.message);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* ✅ Accepter un transfert de stock                                         */
/* -------------------------------------------------------------------------- */
export const acceptTransfer = async (req: Request, res: Response) => {
  try {
    const { transferId } = req.params;
    const user = (req as any).user;

    const transfer = await StockTransfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({ error: "Transfert introuvable" });
    }

    if (transfer.status !== "pending") {
      return res.status(400).json({ error: "Ce transfert a déjà été traité" });
    }

    // Vérifier que l'utilisateur est le destinataire
    if (transfer.toUser && transfer.toUser.toString() !== user.id) {
      const isAuthorized =
        (transfer.toLevel === "regional" && user.role === "regional" && user.region === transfer.toRegion) ||
        (transfer.toLevel === "district" && user.role === "district" && sameHealthCenter(user.healthCenter, transfer.toHealthCenter)) ||
        (transfer.toLevel === "agent" && user.role === "agent" && sameHealthCenter(user.healthCenter, transfer.toHealthCenter));

      if (!isAuthorized) {
        return res.status(403).json({ error: "Vous n'êtes pas autorisé à accepter ce transfert" });
      }
    }

    // Créer ou mettre à jour le stock destination
    const destinationQuery: any = {
      vaccine: transfer.vaccine,
      batchNumber: transfer.batchNumber,
      level: transfer.toLevel,
    };

    if (transfer.toRegion) {
      destinationQuery.region = transfer.toRegion;
    }
    
    if (transfer.toHealthCenter) {
      destinationQuery.healthCenter = buildHealthCenterFilter(transfer.toHealthCenter);
    }

    let destinationStock = await Stock.findOne(destinationQuery);

    if (destinationStock) {
      destinationStock.quantity += transfer.quantity;
      await destinationStock.save();
    } else {
      // Créer un nouveau stock destination
      const sourceStock = await Stock.findById(transfer.stock);
      if (!sourceStock) {
        return res.status(404).json({ error: "Stock source introuvable" });
      }

      destinationStock = await Stock.create({
        vaccine: transfer.vaccine,
        batchNumber: transfer.batchNumber,
        quantity: transfer.quantity,
        expirationDate: sourceStock.expirationDate,
        level: transfer.toLevel,
        region: transfer.toRegion,
        healthCenter: transfer.toHealthCenter,
        createdBy: user.id,
      });
    }

    // Mettre à jour le statut du transfert
    transfer.status = "accepted";
    transfer.acceptedDate = new Date();
    await transfer.save();

    // Notifier l'expéditeur
    const notif = await Notification.create({
      title: `✅ Transfert accepté`,
      message: `Votre transfert de ${transfer.quantity} doses de ${transfer.vaccine} a été accepté.`,
      type: "stock",
      targetRoles: [transfer.fromLevel],
      status: "success",
      icon: "✅",
    });

    sendSocketNotification(io, [transfer.fromLevel], notif);

    res.json({
      message: "Transfert accepté avec succès",
      transfer,
      destinationStock,
    });
  } catch (err: any) {
    console.error("❌ Erreur acceptTransfer:", err.message);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* ❌ Rejeter un transfert de stock                                          */
/* -------------------------------------------------------------------------- */
export const rejectTransfer = async (req: Request, res: Response) => {
  try {
    const { transferId } = req.params;
    const { reason } = req.body;
    const user = (req as any).user;

    const transfer = await StockTransfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({ error: "Transfert introuvable" });
    }

    if (transfer.status !== "pending") {
      return res.status(400).json({ error: "Ce transfert a déjà été traité" });
    }

    // Vérifier que l'utilisateur est le destinataire
    if (transfer.toUser && transfer.toUser.toString() !== user.id) {
      const isAuthorized =
        (transfer.toLevel === "regional" && user.role === "regional" && user.region === transfer.toRegion) ||
        (transfer.toLevel === "district" && user.role === "district" && sameHealthCenter(user.healthCenter, transfer.toHealthCenter)) ||
        (transfer.toLevel === "agent" && user.role === "agent" && sameHealthCenter(user.healthCenter, transfer.toHealthCenter));

      if (!isAuthorized) {
        return res.status(403).json({ error: "Vous n'êtes pas autorisé à rejeter ce transfert" });
      }
    }

    // Restaurer la quantité dans le stock source
    const sourceStock = await Stock.findById(transfer.stock);
    if (sourceStock) {
      sourceStock.quantity += transfer.quantity;
      await sourceStock.save();
    }

    // Mettre à jour le statut du transfert
    transfer.status = "rejected";
    transfer.rejectedDate = new Date();
    transfer.notes = reason || "Rejeté par le destinataire";
    await transfer.save();

    // Notifier l'expéditeur
    const notif = await Notification.create({
      title: `❌ Transfert rejeté`,
      message: `Votre transfert de ${transfer.quantity} doses de ${transfer.vaccine} a été rejeté. Raison: ${transfer.notes}`,
      type: "stock",
      targetRoles: [transfer.fromLevel],
      status: "danger",
      icon: "❌",
    });

    sendSocketNotification(io, [transfer.fromLevel], notif);

    res.json({
      message: "Transfert rejeté",
      transfer,
    });
  } catch (err: any) {
    console.error("❌ Erreur rejectTransfer:", err.message);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 📋 Obtenir les transferts entrants                                        */
/* -------------------------------------------------------------------------- */
export const getIncomingTransfers = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const query: any = { toUser: user.id };

    // Si pas de toUser spécifique, filtrer par niveau et région/centre
    if (!query.toUser) {
      query.toLevel = user.role;
      if (user.region) query.toRegion = user.region;
      if (user.healthCenter) {
        const filter = buildHealthCenterFilter(user.healthCenter);
        if (filter) query.toHealthCenter = filter;
      }
    }

    const transfers = await StockTransfer.find(query)
      .populate("fromUser", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json({
      message: "Transferts entrants récupérés",
      count: transfers.length,
      data: transfers,
    });
  } catch (err: any) {
    console.error("❌ Erreur getIncomingTransfers:", err.message);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 📋 Obtenir les transferts sortants                                        */
/* -------------------------------------------------------------------------- */
export const getOutgoingTransfers = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const transfers = await StockTransfer.find({ fromUser: user.id })
      .populate("toUser", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json({
      message: "Transferts sortants récupérés",
      count: transfers.length,
      data: transfers,
    });
  } catch (err: any) {
    console.error("❌ Erreur getOutgoingTransfers:", err.message);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 📋 Obtenir l'historique complet des transferts                            */
/* -------------------------------------------------------------------------- */
export const getTransferHistory = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const query: any = {
      $or: [
        { fromUser: user.id },
        { toUser: user.id },
      ],
    };

    const transfers = await StockTransfer.find(query)
      .populate("fromUser", "firstName lastName email")
      .populate("toUser", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json({
      message: "Historique des transferts récupéré",
      count: transfers.length,
      data: transfers,
    });
  } catch (err: any) {
    console.error("❌ Erreur getTransferHistory:", err.message);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 📋 Obtenir les destinataires possibles selon le rôle                      */
/* -------------------------------------------------------------------------- */
export const getTransferDestinations = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let destinations: any[] = [];
    const userHealthCenterFilter = buildHealthCenterFilter(user.healthCenter);

    const resolveUserCenterName = async () => {
      if (typeof user.healthCenter === "string" && !mongoose.Types.ObjectId.isValid(user.healthCenter)) {
        return user.healthCenter;
      }
      const asObjectId = toObjectId(user.healthCenter);
      if (!asObjectId) return undefined;
      const center = await HealthCenter.findById(asObjectId).select("name").lean();
      return center?.name;
    };

    console.log('\n🎯 === getTransferDestinations ===');
    console.log('User ID:', user.id);
    console.log('User email:', user.email);
    console.log('User role:', user.role);
    console.log('User region:', user.region);
    console.log('User healthCenter:', user.healthCenter);
    console.log('User active:', user.active);

    if (user.role === "national") {
      // National → Régions
      const regions = await HealthCenter.distinct("region");
      destinations = regions.map((r: string) => ({
        type: "region",
        name: r,
        label: r,
      }));
    } else if (user.role === "regional") {
      // Régional → Districts de sa région
      const districts = await HealthCenter.find({
        region: user.region,
        type: "district",
      }).select("name").lean();
      
      destinations = districts.map((d: any) => ({
        type: "district",
        name: d.name,
        label: d.name,
      }));
    } else if (user.role === "district") {
      // District → Acteurs de santé sous sa supervision
      const districtName = await resolveUserCenterName();
      const actors = await HealthCenter.find({
        $or: [
          ...(districtName
            ? [
                { districtName },
                { district: districtName },
              ]
            : []),
        ],
        type: { $ne: "district" }, // Exclure les districts
      }).select("name type").lean();
      
      destinations = actors.map((a: any) => ({
        type: "healthCenter",
        name: a.name,
        label: `${a.name} (${a.type || 'structure'})`,
        structureType: a.type,
      }));
      
      console.log(`🏛️ District ${user.healthCenter}: ${destinations.length} acteurs trouvés`);
    } else if (user.role === "agent") {
      // Agent → Membres de son équipe (autres agents du même centre)
      const teamFilter: any = { role: "agent", _id: { $ne: user.id } };
      if (userHealthCenterFilter) {
        teamFilter.healthCenter = userHealthCenterFilter;
      }
      const teamMembers = await User.find(teamFilter)
        .select("firstName lastName email")
        .lean();
      
      destinations = teamMembers.map((member: any) => ({
        type: "teamMember",
        userId: member._id,
        name: `${member.firstName} ${member.lastName}`,
        label: `${member.firstName} ${member.lastName}`,
        email: member.email,
      }));
      
      console.log(`👥 Agent ${user.healthCenter}: ${destinations.length} membres d'équipe trouvés`);
    }

    console.log(`✅ ${destinations.length} destinations trouvées`);

    res.json({
      message: "Destinations récupérées",
      count: destinations.length,
      data: destinations,
    });
  } catch (err: any) {
    console.error("❌ Erreur getTransferDestinations:", err.message);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};
