import express from "express";
import {
  createStock,
  getStocks,
  getStockById,
  updateStock,
  deleteStock,
  transferStock,
  getStockDistribution,
} from "../controllers/stockController";
import {
  initiateTransfer,
  acceptTransfer,
  rejectTransfer,
  getIncomingTransfers,
  getOutgoingTransfers,
  getTransferHistory,
  getTransferDestinations,
} from "../controllers/stockTransferController";
import { authMiddleware, roleCheck } from "../middleware/auth";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Stocks
 *   description: Gestion des stocks de vaccins
 */

/* -------------------------------------------------------------------------- */
/* Création d’un nouveau lot (national / régional)                        */
/* -------------------------------------------------------------------------- */
router.post("/", authMiddleware, roleCheck("national", "regional"), createStock);

/* -------------------------------------------------------------------------- */
/* Récupération de tous les lots visibles selon le rôle                  */
/* -------------------------------------------------------------------------- */
router.get("/", authMiddleware, roleCheck("national", "regional", "agent", "district"), getStocks);

/* -------------------------------------------------------------------------- */
/* Voir la distribution d'un lot (où il a été transféré)                 */
/* -------------------------------------------------------------------------- */
router.get("/distribution", authMiddleware, roleCheck("national", "regional"), getStockDistribution);

/* -------------------------------------------------------------------------- */
/* (Optionnel) Récupération des stocks critiques                        */
/* -------------------------------------------------------------------------- */
router.get(
  "/filter/low",
  authMiddleware,
  roleCheck("national", "regional", "agent", "district"),
  async (req, res) => {
    try {
      const { default: Stock } = await import("../models/Stock.js");
      const stocks = await Stock.find().lean({ virtuals: true });
      const lowStocks = stocks.filter((s) => s.lowStock || s.expiringSoon || s.expired);
      res.json({
        message: "Stocks critiques récupérés",
        count: lowStocks.length,
        data: lowStocks,
      });
    } catch (err: any) {
      console.error(" Erreur /filter/low:", err.message);
      res.status(500).json({ error: "Erreur serveur", details: err.message });
    }
  }
);

/* -------------------------------------------------------------------------- */
/* Transférer un stock (national → régional, régional → agent)          */
/* -------------------------------------------------------------------------- */
router.post("/transfer", authMiddleware, roleCheck("national", "regional", "district"), transferStock);

/* -------------------------------------------------------------------------- */
/* 🆕 NOUVEAU SYSTÈME DE TRANSFERTS HIÉRARCHIQUE                            */
/* -------------------------------------------------------------------------- */

// Obtenir les destinataires possibles
router.get("/transfers/destinations", authMiddleware, roleCheck("national", "regional", "district", "agent"), getTransferDestinations);

// Initier un nouveau transfert
router.post("/transfers/initiate", authMiddleware, roleCheck("national", "regional", "district", "agent"), initiateTransfer);

// Accepter un transfert reçu
router.put("/transfers/:transferId/accept", authMiddleware, roleCheck("regional", "district", "agent"), acceptTransfer);

// Rejeter un transfert reçu
router.put("/transfers/:transferId/reject", authMiddleware, roleCheck("regional", "district", "agent"), rejectTransfer);

// Voir les transferts entrants (reçus)
router.get("/transfers/incoming", authMiddleware, roleCheck("regional", "district", "agent"), getIncomingTransfers);

// Voir les transferts sortants (envoyés)
router.get("/transfers/outgoing", authMiddleware, roleCheck("national", "regional", "district"), getOutgoingTransfers);

// Voir l'historique complet des transferts
router.get("/transfers/history", authMiddleware, roleCheck("national", "regional", "district", "agent"), getTransferHistory);

/* -------------------------------------------------------------------------- */
/* Obtenir un lot précis par ID                                           */
/* -------------------------------------------------------------------------- */
router.get("/:id", authMiddleware, roleCheck("national", "regional", "agent", "district"), getStockById);

/* -------------------------------------------------------------------------- */
/* Mise à jour d’un lot                                                  */
/* -------------------------------------------------------------------------- */
router.put("/:id", authMiddleware, roleCheck("national", "regional"), updateStock);

/* -------------------------------------------------------------------------- */
/* Suppression d’un lot                                                  */
/* -------------------------------------------------------------------------- */
router.delete("/:id", authMiddleware, roleCheck("national", "regional"), deleteStock);

export default router;