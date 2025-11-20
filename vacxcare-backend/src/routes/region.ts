import { Router } from "express";
import {
  createRegion,
  deleteRegion,
  getRegions,
  updateRegion,
  updateRegionsStatus,
} from "../controllers/regionController";
import { authMiddleware, roleCheck } from "../middleware/auth";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Regions
 *   description: Gestion des régions par le national
 */

// ➕ Créer une région
router.post("/", authMiddleware, roleCheck("national"), createRegion);

// 📋 Lister toutes les régions
router.get("/", authMiddleware, getRegions);

// 🔄 Mettre à jour en masse l'état actif/inactif des régions
router.put("/update-status", authMiddleware, roleCheck("national"), updateRegionsStatus);

// ✏️ Modifier une région
router.put("/:id", authMiddleware, roleCheck("national"), updateRegion);

// 🗑️ Supprimer une région
router.delete("/:id", authMiddleware, roleCheck("national"), deleteRegion);

export default router;
