import { Router } from "express";
import { authMiddleware, roleCheck } from "../middleware/auth";
import {
  getParentsList,
  getParentDetails,
} from "../controllers/parentController";

const router = Router();

/**
 * @route   GET /api/parents
 * @desc    Obtenir la liste des parents avec nombre d'enfants
 * @access  Private (agent, regional, national)
 */
router.get(
  "/",
  authMiddleware,
  roleCheck("agent", "regional", "national"),
  getParentsList
);

/**
 * @route   GET /api/parents/:phone
 * @desc    Obtenir les détails d'un parent et tous ses enfants
 * @access  Private (agent, regional, national)
 */
router.get(
  "/:phone",
  authMiddleware,
  roleCheck("agent", "regional", "national"),
  getParentDetails
);

export default router;
