import express from "express";
import {
  createVaccine,
  deleteVaccine,
  getVaccineById,
  getVaccines,
  updateVaccine,
} from "../controllers/vaccineController";
import { authMiddleware, roleCheck } from "../middleware/auth";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Vaccines
 *   description: Gestion des vaccins
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Vaccine:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *           description: Nom du vaccin
 */

// ➕ Création → national & regional
router.post(
  "/",
  authMiddleware,
  roleCheck("national", "regional"),
  createVaccine
);

/**
 * @swagger
 * /api/vaccine:
 *   get:
 *     summary: Récupérer la liste des vaccins
 *     tags: [Vaccines]
 *     security: [ { bearerAuth: [] } ]
 */
router.get("/", authMiddleware, getVaccines);

/**
 * @swagger
 * /api/vaccine/{id}:
 *   get:
 *     summary: Récupérer un vaccin par ID
 *     tags: [Vaccines]
 *     security: [ { bearerAuth: [] } ]
 */
router.get("/:id", authMiddleware, getVaccineById);

// ✏️ Mise à jour
router.put(
  "/:id",
  authMiddleware,
  roleCheck("national", "regional"),
  updateVaccine
);

// ❌ Suppression
router.delete(
  "/:id",
  authMiddleware,
  roleCheck("national", "regional"),
  deleteVaccine
);

export default router;
