import { Router } from "express";
import {
  createAgent,
  deleteAgent,
  getAgents,
} from "../controllers/agentController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

/**
 * @swagger
 * /agents:
 *   get:
 *     summary: Liste des agents
 *   post:
 *     summary: Créer un agent (national uniquement)
 * /agents/{id}:
 *   delete:
 *     summary: Supprimer un agent
 */
router.get("/", authMiddleware, getAgents);
router.post("/", authMiddleware, createAgent);
router.delete("/:id", authMiddleware, deleteAgent);

export default router;
