import { Request, Response } from "express";
import Stock from "../models/Stock";
import Notification from "../models/Notification";
import { io } from "../server";
import { sendSocketNotification } from "../utils/socketManager";

/* -------------------------------------------------------------------------- */
/* 🔔 Fonction utilitaire – envoi automatique de notifications                */
/* -------------------------------------------------------------------------- */
async function sendStockNotification(
  type: "create" | "update" | "low" | "expiring" | "expired" | "restored" | "transfer",
  vaccine: string,
  quantity: number,
  batchNumber?: string,
  region?: string
) {
  try {
    let title = "";
    let message = "";
    let status: "info" | "warning" | "danger" | "success" = "info";
    let icon = "🔔";
    const targetRoles = ["agent", "regional"]; // ✅ notification ciblée

    switch (type) {
      case "create":
        title = `🆕 Nouveau lot ajouté – ${vaccine}`;
        message = `Un nouveau lot (${batchNumber}) de ${vaccine} a été ajouté avec ${quantity} doses.`;
        status = "info";
        icon = "🆕";
        break;

      case "update":
        title = `🔄 Stock mis à jour – ${vaccine}`;
        message = `Le stock du vaccin ${vaccine} a été mis à jour (${quantity} doses restantes).`;
        status = "info";
        icon = "🔄";
        break;

      case "low":
        title = `⚠️ Stock critique – ${vaccine}`;
        message = `Le stock de ${vaccine} est critique (${quantity} doses restantes).`;
        status = "warning";
        icon = "⚠️";
        break;

      case "restored":
        title = `✅ Stock rétabli – ${vaccine}`;
        message = `Le stock du vaccin ${vaccine} est revenu à un niveau normal (${quantity} doses disponibles).`;
        status = "success";
        icon = "✅";
        break;

      case "expiring":
        title = `⏰ Expiration proche – ${vaccine}`;
        message = `Le lot ${batchNumber} de ${vaccine} expire bientôt (dans moins de 30 jours).`;
        status = "warning";
        icon = "⏰";
        break;

      case "expired":
        title = `❌ Stock expiré – ${vaccine}`;
        message = `Le lot ${batchNumber} de ${vaccine} est arrivé à expiration.`;
        status = "danger";
        icon = "❌";
        break;
    }

    // 🧠 Vérifie si une alerte du même type/vaccin/lot a été envoyée dans les 24 dernières heures
    const recentNotif = await Notification.findOne({
      type: "stock",
      title,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 24h
    });

    if (recentNotif && ["low", "expiring", "expired"].includes(type)) {
      console.log(`⏳ Notification "${title}" déjà envoyée dans les 24h.`);
      return;
    }

    const notif = await Notification.create({
      title,
      message,
      type: "stock",
      targetRoles,
      status,
      icon,
    });

    sendSocketNotification(io, targetRoles, notif);
    console.log(`📡 Notification envoyée (${status.toUpperCase()}) → ${title}`);
  } catch (err) {
    console.error("❌ Erreur envoi notification stock:", err);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧩 Créer un lot de vaccin                                                 */
/* -------------------------------------------------------------------------- */
export const createStock = async (req: Request, res: Response) => {
  try {
    const { vaccine, batchNumber, quantity, expirationDate, region, healthCenter } = req.body;
    const user = (req as any).user;

    if (!vaccine || !batchNumber || !quantity || !expirationDate) {
      return res.status(400).json({
        error: "Les champs vaccine, batchNumber, quantity et expirationDate sont requis",
      });
    }

    const normalizedVaccine = vaccine.trim().toUpperCase();
    const normalizedBatch = batchNumber.trim().toUpperCase();

    const existing = await Stock.findOne({
      vaccine: normalizedVaccine,
      batchNumber: normalizedBatch,
      healthCenter: user.healthCenter || healthCenter || undefined,
    });

    if (existing) {
      const prevQty = existing.quantity;
      existing.quantity += Number(quantity);
      await existing.save();

      if (prevQty < 10 && existing.quantity >= 10) {
        await sendStockNotification("restored", normalizedVaccine, existing.quantity, normalizedBatch, existing.region);
      } else if (existing.quantity < 10) {
        await sendStockNotification("low", normalizedVaccine, existing.quantity, normalizedBatch, existing.region);
      } else {
        await sendStockNotification("update", normalizedVaccine, existing.quantity, normalizedBatch, existing.region);
      }

      return res.status(200).json({
        message: "Quantité mise à jour (lot déjà existant)",
        stock: existing,
      });
    }

    // Déterminer le niveau basé sur le rôle de l'utilisateur
    let level: "national" | "regional" | "district" | "agent" = "national";
    if (user.role === "regional") level = "regional";
    else if (user.role === "district") level = "district";
    else if (user.role === "agent") level = "agent";

    const stock = new Stock({
      vaccine: normalizedVaccine,
      batchNumber: normalizedBatch,
      quantity,
      expirationDate,
      level,
      region: user.region || region,
      healthCenter: user.healthCenter || healthCenter,
      createdBy: user.id,
    });

    await stock.save();

    if (quantity < 10) {
      await sendStockNotification("low", normalizedVaccine, quantity, normalizedBatch, region);
    } else {
      await sendStockNotification("create", normalizedVaccine, quantity, normalizedBatch, region);
    }

    res.status(201).json({ message: "Lot créé avec succès", stock });
  } catch (err: any) {
    console.error("❌ Erreur createStock:", err.message);
    res.status(500).json({ error: "Erreur lors de la création du lot", details: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 📋 Obtenir la liste des lots filtrés par rôle                             */
/* -------------------------------------------------------------------------- */
export const getStocks = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const query: any = {};

    // Filtrer selon le rôle et le niveau
    if (user.role === "national") {
      // National voit ses stocks nationaux + stocks sans level (anciens stocks)
      query.$or = [
        { level: "national" },
        { level: { $exists: false }, $or: [{ region: { $exists: false } }, { region: null }, { region: "" }] }
      ];
    } else if (user.role === "regional") {
      // Régional voit ses stocks régionaux de sa région
      query.$or = [
        { level: "regional", region: user.region },
        { level: { $exists: false }, region: user.region, $or: [{ healthCenter: { $exists: false } }, { healthCenter: null }, { healthCenter: "" }] }
      ];
    } else if (user.role === "district") {
      // District voit ses stocks de district
      query.$or = [
        { level: "district", region: user.region, healthCenter: user.healthCenter },
        { level: { $exists: false }, region: user.region, healthCenter: user.healthCenter }
      ];
    } else if (user.role === "agent") {
      // Distinguer facility_admin et facility_staff
      if (user.agentLevel === "facility_staff") {
        // 👨‍⚕️ facility_staff : voit uniquement ses stocks assignés
        query.$or = [
          { level: "agent", assignedTo: user.id },
          { level: { $exists: false }, healthCenter: user.healthCenter, assignedTo: user.id }
        ];
      } else {
        // 👨‍💼 facility_admin (ou agents sans agentLevel) : voit tous les stocks du centre
        query.$or = [
          { level: "agent", healthCenter: user.healthCenter },
          { level: { $exists: false }, healthCenter: user.healthCenter }
        ];
      }
    }

    const stocks = await Stock.find(query).lean({ virtuals: true }).sort({ expirationDate: 1 });

    // 🔍 Debug : Afficher la requête et les résultats
    console.log(`\n📊 ========= GET STOCKS pour ${user.role} =========`);
    console.log(`👤 User email: ${user.email}`);
    console.log(`👤 User ID: ${user.id}`);
    console.log(`📍 User region: "${user.region}"`);
    console.log(`🏥 User healthCenter: "${user.healthCenter || 'N/A'}"`);
    console.log(`🏷️  User agentLevel: "${user.agentLevel || 'N/A'}"`);
    console.log(`🔍 Requête MongoDB:`, JSON.stringify(query, null, 2));
    console.log(`📦 Stocks trouvés: ${stocks.length}`);
    
    if (stocks.length > 0) {
      console.log(`📋 Premier stock:`, JSON.stringify(stocks[0], null, 2));
    } else {
      console.log(`❌ AUCUN STOCK TROUVÉ - Vérifions tous les stocks régionaux dans la DB...`);
      // Pour debug: voir TOUS les stocks régionaux
      const allRegionalStocks = await Stock.find({ level: "regional" }).lean();
      console.log(`🔍 Tous les stocks level=regional dans la DB: ${allRegionalStocks.length}`);
      if (allRegionalStocks.length > 0) {
        allRegionalStocks.forEach((s, i) => {
          console.log(`  ${i+1}. region="${s.region}" vaccine=${s.vaccine} qty=${s.quantity}`);
        });
      }
    }
    console.log(`📊 ========================================\n`);

    // 🚫 On ne renvoie plus de notifications automatiques ici
    // Ces alertes doivent être envoyées une fois par jour via une tâche CRON
    // pour éviter le spam ou l'ordre inversé

    res.json({ message: "Stocks récupérés avec succès", count: stocks.length, data: stocks });
  } catch (err: any) {
    console.error("❌ Erreur getStocks:", err.message);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 🔍 Obtenir un lot spécifique                                              */
/* -------------------------------------------------------------------------- */
export const getStockById = async (req: Request, res: Response) => {
  try {
    const stock = await Stock.findById(req.params.id).lean({ virtuals: true });
    if (!stock) {
      return res.status(404).json({ error: "Lot introuvable" });
    }
    res.json(stock);
  } catch (err: any) {
    console.error("❌ Erreur getStockById:", err.message);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* ✏️ Mettre à jour un lot                                                   */
/* -------------------------------------------------------------------------- */
export const updateStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const oldStock = await Stock.findById(id);
    if (!oldStock) return res.status(404).json({ error: "Lot introuvable" });

    const wasLow = oldStock.quantity < 10;

    const stock = await Stock.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean({ virtuals: true });

    if (!stock) return res.status(404).json({ error: "Lot introuvable" });

    if (wasLow && stock.quantity >= 10) {
      await sendStockNotification("restored", stock.vaccine, stock.quantity, stock.batchNumber, stock.region);
    } else if (stock.quantity < 10) {
      await sendStockNotification("low", stock.vaccine, stock.quantity, stock.batchNumber, stock.region);
    } else {
      await sendStockNotification("update", stock.vaccine, stock.quantity, stock.batchNumber, stock.region);
    }

    res.json({ message: "Lot mis à jour avec succès", stock });
  } catch (err: any) {
    console.error("❌ Erreur updateStock:", err.message);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* ➖ Décrémenter après vaccination                                          */
/* -------------------------------------------------------------------------- */
export const decrementStock = async (vaccineName: string, healthCenter?: string) => {
  try {
    const normalizedName = vaccineName.trim().toUpperCase();
    const stock = await Stock.findOne({
      vaccine: normalizedName,
      ...(healthCenter && { healthCenter }),
    }).sort({ expirationDate: 1 });

    if (stock && stock.quantity > 0) {
      const prev = stock.quantity;
      stock.quantity -= 1;
      await stock.save();

      if (prev >= 10 && stock.quantity < 10) {
        await sendStockNotification("low", stock.vaccine, stock.quantity, stock.batchNumber, stock.region);
      } else if (prev < 10 && stock.quantity >= 10) {
        await sendStockNotification("restored", stock.vaccine, stock.quantity, stock.batchNumber, stock.region);
      }

      console.log(`✅ Stock décrémenté pour ${normalizedName} (${stock.batchNumber})`);
    } else {
      console.warn(`⚠️ Aucun stock trouvé ou quantité nulle pour ${normalizedName}`);
    }
  } catch (err: any) {
    console.error("❌ Erreur decrementStock:", err.message);
  }
};

/* -------------------------------------------------------------------------- */
/* ❌ Supprimer un lot                                                       */
/* -------------------------------------------------------------------------- */
export const deleteStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await Stock.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Lot introuvable" });
    res.json({ message: "Lot supprimé avec succès" });
  } catch (err: any) {
    console.error("❌ Erreur deleteStock:", err.message);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 🔍 Voir la distribution d'un lot (où il a été transféré)                  */
/* -------------------------------------------------------------------------- */
export const getStockDistribution = async (req: Request, res: Response) => {
  try {
    const { vaccine, batchNumber } = req.query;
    const user = (req as any).user;

    if (!vaccine || !batchNumber) {
      return res.status(400).json({ error: "Vaccin et numéro de lot requis" });
    }

    const query: any = {
      vaccine: String(vaccine).toUpperCase(),
      batchNumber: String(batchNumber).toUpperCase(),
    };

    // Filtre selon le rôle
    if (user.role === "national") {
      // National voit tous les stocks régionaux de ce lot (pas les centres)
      query.region = { $exists: true, $nin: [null, ""] };
      query.healthCenter = { $exists: false }; // Exclure les stocks au niveau des centres
    } else if (user.role === "regional") {
      // Régional voit les centres de sa région
      query.region = user.region;
      query.healthCenter = { $exists: true, $nin: [null, ""] };
    }

    const stocks = await Stock.find(query)
      .lean({ virtuals: true })
      .sort({ region: 1, healthCenter: 1 });

    res.json({ message: "Distribution récupérée", data: stocks });
  } catch (err: any) {
    console.error("❌ Erreur getStockDistribution:", err.message);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* 🔄 Transférer un stock (national → régional ou régional → agent)         */
/* -------------------------------------------------------------------------- */
export const transferStock = async (req: Request, res: Response) => {
  try {
    const { stockId, quantity, targetRegion, targetHealthCenter } = req.body;
    const user = (req as any).user;

    // Validation
    if (!stockId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: "Stock ID et quantité valide requis" });
    }

    if (!targetRegion && !targetHealthCenter) {
      return res.status(400).json({ error: "Destination (région ou centre) requise" });
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

    // Décrémenter le stock source
    sourceStock.quantity -= quantity;
    await sourceStock.save();

    // Créer ou mettre à jour le stock destination
    const destinationQuery: any = {
      vaccine: sourceStock.vaccine,
      batchNumber: sourceStock.batchNumber,
    };

    if (targetRegion) {
      // Transfert vers région : doit être au niveau régional (sans centre)
      destinationQuery.region = targetRegion;
      destinationQuery.healthCenter = { $exists: false };
    }
    
    if (targetHealthCenter) {
      // Transfert vers centre : doit inclure la région source
      destinationQuery.region = sourceStock.region;
      destinationQuery.healthCenter = targetHealthCenter;
    }

    let destinationStock = await Stock.findOne(destinationQuery);

    if (destinationStock) {
      destinationStock.quantity += quantity;
      await destinationStock.save();
    } else {
      // Créer un nouveau stock destination
      const newStockData: any = {
        vaccine: sourceStock.vaccine,
        batchNumber: sourceStock.batchNumber,
        quantity,
        expirationDate: sourceStock.expirationDate,
        region: targetRegion || sourceStock.region,
        createdBy: user.id,
      };
      
      // N'ajouter healthCenter que si c'est un transfert vers un centre
      if (targetHealthCenter) {
        newStockData.healthCenter = targetHealthCenter;
      }
      
      destinationStock = await Stock.create(newStockData);
    }

    // Envoyer notification ciblée
    const targetRoles = targetHealthCenter ? ["agent"] : ["regional"];
    const destination = targetHealthCenter || targetRegion;
    const title = `📦 Transfert reçu – ${sourceStock.vaccine}`;
    const message = `Vous avez reçu ${quantity} doses de ${sourceStock.vaccine} (lot ${sourceStock.batchNumber}).`;

    const notif = await Notification.create({
      title,
      message,
      type: "stock",
      targetRoles,
      status: "success",
      icon: "📦",
    });

    sendSocketNotification(io, targetRoles, notif);

    res.json({
      message: "Transfert effectué avec succès",
      sourceStock,
      destinationStock,
    });
  } catch (err: any) {
    console.error("❌ Erreur transferStock:", err.message);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};