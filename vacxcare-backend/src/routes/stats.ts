import express from "express";
import {
  getActiveCampaigns,
  getAgentStats,
  getCoverageByRegion,
  getCoverageRate,
  getCriticalStocks,
  getDashboardStats,
  getRegionalStats,
  getStocksByVaccine,
  getVaccinationsByPeriod,
  getVaccinationsStats,
  getDistrictStats,
} from "../controllers/statsController";
import { authMiddleware, roleCheck } from "../middleware/auth";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Stats
 *   description: Statistiques et indicateurs nationaux
 */

/**
 * @swagger
 * /api/stats/vaccinations:
 *   get:
 *     summary: Obtenir le nombre total de vaccinations par vaccin
 *     tags: [Stats]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Statistiques par vaccin
 */
router.get(
  "/vaccinations",
  authMiddleware,
  roleCheck("national"),
  getVaccinationsStats
);

/**
 * @swagger
 * /api/stats/coverage:
 *   get:
 *     summary: Obtenir le taux de couverture vaccinale global
 *     tags: [Stats]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Taux de couverture
 */
router.get("/coverage", authMiddleware, roleCheck("national"), getCoverageRate);

/**
 * @swagger
 * /api/stats/stocks:
 *   get:
 *     summary: Lister les stocks critiques (<50)
 *     tags: [Stats]
 *     security: [ { bearerAuth: [] } ]
 */
router.get("/stocks", authMiddleware, roleCheck("national"), getCriticalStocks);

/**
 * @swagger
 * /api/stats/campaigns:
 *   get:
 *     summary: Lister les campagnes actives
 *     tags: [Stats]
 *     security: [ { bearerAuth: [] } ]
 */
router.get(
  "/campaigns",
  authMiddleware,
  roleCheck("national"),
  getActiveCampaigns
);

/**
 * @swagger
 * /api/stats/coverage/by-region:
 *   get:
 *     summary: Obtenir la couverture vaccinale par région
 *     tags: [Stats]
 *     security: [ { bearerAuth: [] } ]
 */
router.get(
  "/coverage/by-region",
  authMiddleware,
  roleCheck("national"),
  getCoverageByRegion
);

/**
 * @swagger
 * /api/stats/vaccinations/by-period:
 *   get:
 *     summary: Obtenir le nombre de vaccinations sur une période
 *     tags: [Stats]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date }
 */
router.get(
  "/vaccinations/by-period",
  authMiddleware,
  roleCheck("national"),
  getVaccinationsByPeriod
);

/**
 * @swagger
 * /api/stats/stocks/by-vaccine:
 *   get:
 *     summary: Obtenir les stocks regroupés par vaccin
 *     tags: [Stats]
 *     security: [ { bearerAuth: [] } ]
 */
router.get(
  "/stocks/by-vaccine",
  authMiddleware,
  roleCheck("national"),
  getStocksByVaccine
);

/**
 * @swagger
 * /api/stats/dashboard:
 *   get:
 *     summary: Obtenir les chiffres du dashboard global
 *     tags: [Stats]
 *     security: [ { bearerAuth: [] } ]
 */
router.get(
  "/dashboard",
  authMiddleware,
  roleCheck("national"),
  getDashboardStats
);

/**
 * @swagger
 * /api/stats/agent:
 *   get:
 *     summary: Obtenir les statistiques pour un agent
 *     tags: [Stats]
 *     security: [ { bearerAuth: [] } ]
 */
router.get(
  "/agent",
  authMiddleware,
  roleCheck("agent", "district"),
  getAgentStats
);

/**
 * @swagger
 * /api/stats/district:
 *   get:
 *     summary: Obtenir les statistiques agrégées pour le district de l'agent connecté
 *     tags: [Stats]
 *     security: [ { bearerAuth: [] } ]
 */
router.get(
  "/district",
  authMiddleware,
  roleCheck("agent"),
  getDistrictStats
);

/**
 * @swagger
 * /api/stats/regional:
 *   get:
 *     summary: Obtenir les statistiques pour un régional
 *     tags: [Stats]
 *     security: [ { bearerAuth: [] } ]
 */
router.get(
  "/regional",
  authMiddleware,
  roleCheck("regional"),
  getRegionalStats
);

export default router;
