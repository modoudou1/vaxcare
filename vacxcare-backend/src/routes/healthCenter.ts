import { Router } from "express";
import {
  createHealthCenter,
  deleteHealthCenter,
  getHealthCenterById,
  getHealthCenterByName,
  getHealthCenters,
  updateHealthCenter,
} from "../controllers/healthCenterController";
import { authMiddleware, roleCheck } from "../middleware/auth";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: HealthCenters
 *   description: Gestion des centres de santé
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     HealthCenter:
 *       type: object
 *       required:
 *         - name
 *         - region
 *       properties:
 *         id: { type: string, description: ID auto-généré }
 *         name: { type: string, description: Nom du centre }
 *         region: { type: string, description: Région associée }
 */

// ➕ Créer
/**
 * @swagger
 * /api/healthcenters:
 *   post:
 *     summary: Créer un centre de santé
 *     tags: [HealthCenters]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/HealthCenter' }
 *     responses:
 *       201: { description: Centre créé }
 */
router.post(
  "/",
  authMiddleware,
  roleCheck("national", "regional", "agent", "district"),
  (req, res) => createHealthCenter(req, res)
);

/**
 * @swagger
 * /api/healthcenters:
 *   get:
 *     summary: Récupérer tous les centres de santé
 *     tags: [HealthCenters]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Liste des centres }
 */
router.get("/", authMiddleware, (req, res) => getHealthCenters(req, res));

/**
 * @swagger
 * /api/healthcenters/{id}:
 *   get:
 *     summary: Récupérer un centre par ID
 *     tags: [HealthCenters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Centre trouvé }
 *       404: { description: Centre introuvable }
 */
router.get("/:id", authMiddleware, (req, res) => getHealthCenterById(req, res));

/**
 * @swagger
 * /api/healthcenters/{id}:
 *   put:
 *     summary: Mettre à jour un centre
 *     tags: [HealthCenters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Centre mis à jour }
 */
router.put(
  "/:id",
  authMiddleware,
  roleCheck("national", "regional", "district"),
  (req, res) => updateHealthCenter(req, res)
);

/**
 * @swagger
 * /api/healthcenters/{id}:
 *   delete:
 *     summary: Supprimer un centre
 *     tags: [HealthCenters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Centre supprimé }
 */
router.delete(
  "/:id",
  authMiddleware,
  roleCheck("national", "regional", "district"),
  (req, res) => deleteHealthCenter(req, res)
);

/**
 * @swagger
 * /api/healthcenters/name/{name}:
 *   get:
 *     summary: Récupérer un centre par nom
 *     tags: [HealthCenters]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Centre trouvé }
 *       404: { description: Centre introuvable }
 */
router.get("/name/:name", (req, res) => getHealthCenterByName(req, res));

export default router;
