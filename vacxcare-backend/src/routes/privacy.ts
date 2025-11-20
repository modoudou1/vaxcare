import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  requestDataExport,
  deleteAccount,
  getCacheSize,
} from "../controllers/privacyController";

const router = Router();

/**
 * @route   POST /api/mobile/request-data-export
 * @desc    Demander un export RGPD de toutes les données du parent
 * @access  Private (parent mobile)
 */
router.post("/request-data-export", authMiddleware, requestDataExport);

/**
 * @route   DELETE /api/mobile/account
 * @desc    Supprimer le compte parent et toutes ses données (IRRÉVERSIBLE)
 * @access  Private (parent mobile)
 */
router.delete("/account", authMiddleware, deleteAccount);

/**
 * @route   GET /api/mobile/cache-size
 * @desc    Obtenir la taille estimée du cache utilisateur
 * @access  Private (parent mobile)
 */
router.get("/cache-size", authMiddleware, getCacheSize);

export default router;
