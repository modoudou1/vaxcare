import express from "express";
import {
  createVaccineCalendar,
  deleteVaccineCalendar,
  getVaccineCalendar,
  updateVaccineCalendar,
  generateVaccineCalendarPDF
} from "../controllers/VaccineCalendarController";
import { authMiddleware, roleCheck } from "../middleware/auth";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: VaccineCalendar
 *   description: Gestion du calendrier vaccinal
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     VaccineCalendar:
 *       type: object
 *       required:
 *         - vaccine
 *         - dose
 *         - ageUnit
 *       properties:
 *         id:
 *           type: string
 *         vaccine:
 *           type: array
 *           items:
 *             type: string
 *           description: "Nom(s) du vaccin (ex: 'BCG', 'Polio', etc.)"
 *         dose:
 *           type: string
 *           description: "Dose spécifique (ex: '1ère dose', '2ème dose')"
 *         ageUnit:
 *           type: string
 *           enum: ["weeks", "months", "years"]
 *           description: "Unité de l'âge (semaines, mois, années)"
 *         minAge:
 *           type: number
 *           description: "Âge minimal pour ce vaccin (utilisé pour une tranche)"
 *         maxAge:
 *           type: number
 *           description: "Âge maximal pour ce vaccin (utilisé pour une tranche)"
 *         specificAge:
 *           type: number
 *           description: "Âge spécifique (utilisé lorsque ce n'est pas une tranche)"
 *         description:
 *           type: string
 *           description: "Description ou notes additionnelles"
 *         createdBy:
 *           type: string
 *           description: "ID de l'utilisateur qui a créé l'entrée"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// ➕ Créer une entrée dans le calendrier vaccinal
router.post("/", authMiddleware, roleCheck("national"), createVaccineCalendar);

// 📋 Récupérer tous les calendriers de vaccins
router.get("/", authMiddleware, getVaccineCalendar);

// ✏️ Mettre à jour un calendrier vaccinal
router.put(
  "/:id",
  authMiddleware,
  roleCheck("national"),
  updateVaccineCalendar
);

// ❌ Supprimer un calendrier vaccinal
router.delete(
  "/:id",
  authMiddleware,
  roleCheck("national"),
  deleteVaccineCalendar
);

// Route pour générer et télécharger le PDF
router.get("/download-pdf", authMiddleware, roleCheck("national"), generateVaccineCalendarPDF);
export default router;
