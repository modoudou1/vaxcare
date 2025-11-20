import express from "express";
import { getAgentDashboard, getAgentStats, getAgentCalendar } from "../controllers/agentDashboardController";
import { getNationalDashboard } from "../controllers/dashboardController";
import { getRegionalDashboard } from "../controllers/regionalDashboardController";
import { authMiddleware, roleCheck } from "../middleware/auth";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Vue globale des indicateurs
 */

/**
 * @swagger
 * /api/dashboard/national:
 *   get:
 *     summary: Récupérer le dashboard national
 *     tags: [Dashboard]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Indicateurs globaux
 */
router.get(
  "/national",
  authMiddleware,
  roleCheck("national"),
  getNationalDashboard
);

/**
 * @swagger
 * /api/dashboard/regional:
 *   get:
 *     summary: Récupérer le dashboard régional
 *     tags: [Dashboard]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Indicateurs régionaux
 */
router.get(
  "/regional",
  authMiddleware,
  roleCheck("regional"),
  getRegionalDashboard
);

/**
 * @swagger
 * /api/dashboard/agent:
 *   get:
 *     summary: Récupérer le dashboard agent
 *     tags: [Dashboard]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Indicateurs agent
 */
router.get("/agent", authMiddleware, roleCheck("agent", "district"), getAgentDashboard);

/**
 * @swagger
 * /api/dashboard/agent/stats:
 *   get:
 *     summary: Récupérer les statistiques pour le nouveau dashboard agent moderne
 *     tags: [Dashboard]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Statistiques complètes pour l'agent
 */
router.get("/agent/stats", authMiddleware, roleCheck("agent", "district"), getAgentStats);

/**
 * @swagger
 * /api/dashboard/agent/calendar:
 *   get:
 *     summary: Récupérer les rendez-vous pour le calendrier agent
 *     tags: [Dashboard]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Mois (1-12)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Année
 *     responses:
 *       200:
 *         description: Liste des rendez-vous formatés pour le calendrier
 */
router.get("/agent/calendar", authMiddleware, roleCheck("agent", "district"), getAgentCalendar);

export default router;
