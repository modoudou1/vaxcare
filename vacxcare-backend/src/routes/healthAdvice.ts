import express from "express";
import {
  createAdvice,
  deleteAdvice,
  getAdviceById,
  getAllAdvice,
  updateAdvice,
} from "../controllers/healthAdviceController";
import { authMiddleware, roleCheck } from "../middleware/auth";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: HealthAdvice
 *   description: Conseils santé
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     HealthAdvice:
 *       type: object
 *       required:
 *         - title
 *         - content
 *       properties:
 *         id: { type: string }
 *         title: { type: string }
 *         content: { type: string }
 *         createdAt: { type: string, format: date-time }
 */

/**
 * @swagger
 * /api/health-advices:
 *   get:
 *     summary: Récupérer tous les conseils santé
 *     tags: [HealthAdvice]
 *     responses:
 *       200:
 *         description: Liste des conseils santé
 */
router.get("/", getAllAdvice);

/**
 * @swagger
 * /api/health-advices/{id}:
 *   get:
 *     summary: Récupérer un conseil santé par ID
 *     tags: [HealthAdvice]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Conseil santé trouvé
 *       404:
 *         description: Conseil introuvable
 */
router.get("/:id", getAdviceById);

/**
 * @swagger
 * /api/health-advices:
 *   post:
 *     summary: Créer un conseil santé (national uniquement)
 *     tags: [HealthAdvice]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HealthAdvice'
 *     responses:
 *       201:
 *         description: Conseil créé
 */
router.post("/", authMiddleware, roleCheck("national"), createAdvice);

/**
 * @swagger
 * /api/health-advices/{id}:
 *   put:
 *     summary: Mettre à jour un conseil santé (national uniquement)
 *     tags: [HealthAdvice]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HealthAdvice'
 *     responses:
 *       200:
 *         description: Conseil mis à jour
 */
router.put("/:id", authMiddleware, roleCheck("national"), updateAdvice);

/**
 * @swagger
 * /api/health-advices/{id}:
 *   delete:
 *     summary: Supprimer un conseil santé (national uniquement)
 *     tags: [HealthAdvice]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Conseil supprimé
 */
router.delete("/:id", authMiddleware, roleCheck("national"), deleteAdvice);

export default router;
