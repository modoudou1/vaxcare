import express from "express";
import { getNationalDashboard } from "../controllers/dashboardController";
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

// Routes temporaires pour tester
router.get("/regional", (req, res) => {
  res.json({ message: "Dashboard régional - en cours de développement" });
});

router.get("/agent", (req, res) => {
  res.json({ message: "Dashboard agent - en cours de développement" });
});

export default router;

