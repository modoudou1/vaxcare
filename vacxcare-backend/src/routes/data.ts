import express from "express";
import {
  createCampaign,
  createChildrenInRegion,
  createVaccinationsForMonth,
  createVaccine,
  getCurrentStats,
} from "../controllers/dataController";

const router = express.Router();

/**
 * @swagger
 * /api/data/children:
 *   post:
 *     summary: Créer des enfants dans une région
 *     tags: [Data]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               region:
 *                 type: string
 *                 example: "Dakar"
 *               count:
 *                 type: number
 *                 example: 50
 *     responses:
 *       200:
 *         description: Enfants créés avec succès
 */
router.post("/children", createChildrenInRegion);

/**
 * @swagger
 * /api/data/vaccinations:
 *   post:
 *     summary: Créer des vaccinations pour un mois
 *     tags: [Data]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               month:
 *                 type: number
 *                 example: 1
 *               year:
 *                 type: number
 *                 example: 2024
 *               count:
 *                 type: number
 *                 example: 100
 *     responses:
 *       200:
 *         description: Vaccinations créées avec succès
 */
router.post("/vaccinations", createVaccinationsForMonth);

/**
 * @swagger
 * /api/data/vaccines:
 *   post:
 *     summary: Créer un vaccin
 *     tags: [Data]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "BCG"
 *               description:
 *                 type: string
 *                 example: "Vaccin contre la tuberculose"
 *               dosesRequired:
 *                 type: number
 *                 example: 1
 *     responses:
 *       200:
 *         description: Vaccin créé avec succès
 */
router.post("/vaccines", createVaccine);

/**
 * @swagger
 * /api/data/campaigns:
 *   post:
 *     summary: Créer une campagne
 *     tags: [Data]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Campagne BCG 2024"
 *               description:
 *                 type: string
 *                 example: "Campagne de vaccination BCG"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-31"
 *               region:
 *                 type: string
 *                 example: "Dakar"
 *     responses:
 *       200:
 *         description: Campagne créée avec succès
 */
router.post("/campaigns", createCampaign);

/**
 * @swagger
 * /api/data/stats:
 *   get:
 *     summary: Obtenir les statistiques actuelles
 *     tags: [Data]
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
 */
router.get("/stats", getCurrentStats);

export default router;




