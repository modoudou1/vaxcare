import express, { Request, Response } from "express";
import {
  addMediaToCampaign,
  createCampaign,
  deleteCampaign,
  getCampaignById,
  getCampaigns,
  removeMediaFromCampaign,
  updateCampaign,
} from "../controllers/campaignController";
import { authMiddleware, roleCheck } from "../middleware/auth";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Campaigns
 *   description: Gestion des campagnes de vaccination
 */

// ➕ Créer une campagne
router.post(
  "/",
  authMiddleware,
  roleCheck("national"),
  (req: Request, res: Response) => createCampaign(req, res)
);

// 📋 Récupérer toutes les campagnes
router.get("/", authMiddleware, (req: Request, res: Response) =>
  getCampaigns(req, res)
);

// 📌 Récupérer une campagne par ID
router.get("/:id", authMiddleware, (req: Request, res: Response) =>
  getCampaignById(req, res)
);

// ✏️ Modifier une campagne
router.put(
  "/:id",
  authMiddleware,
  roleCheck("national"),
  (req: Request, res: Response) => updateCampaign(req, res)
);

// ❌ Supprimer une campagne
router.delete(
  "/:id",
  authMiddleware,
  roleCheck("national"),
  (req: Request, res: Response) => deleteCampaign(req, res)
);

// ➕ Ajouter un média (vidéo/pdf)
router.patch(
  "/:id/medias",
  authMiddleware,
  roleCheck("national"),
  (req: Request, res: Response) => addMediaToCampaign(req, res)
);

// ❌ Supprimer un média
router.delete(
  "/:id/medias",
  authMiddleware,
  roleCheck("national"),
  (req: Request, res: Response) => removeMediaFromCampaign(req, res)
);

export default router;
