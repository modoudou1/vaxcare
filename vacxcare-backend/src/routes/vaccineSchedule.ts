import express from "express";
import {
  createVaccineSchedule,
  deleteVaccineSchedule,
  getVaccineByAge,
  getVaccineByRange,
  getVaccineSchedule,
  updateVaccineSchedule,
  exportVaccineSchedulePdf,
} from "../controllers/vaccineScheduleController";
import { authMiddleware, roleCheck } from "../middleware/auth";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: VaccineSchedule
 *   description: Gestion du calendrier vaccinal (semaines, mois, années)
 */

// ➕ Ajouter une tranche (national uniquement)
router.post("/", authMiddleware, roleCheck("national"), createVaccineSchedule);

// 📋 Récupérer le calendrier complet
router.get("/", authMiddleware, getVaccineSchedule);

// 🔎 Récupérer les vaccins pour un âge donné
router.get("/:age", authMiddleware, getVaccineByAge);

// ⏳ Récupérer les vaccins par intervalle
router.get("/range/filter", authMiddleware, getVaccineByRange);

// ✏️ Mettre à jour une tranche
router.put(
  "/:id",
  authMiddleware,
  roleCheck("national"),
  updateVaccineSchedule
);

// ❌ Supprimer une tranche
router.delete(
  "/:id",
  authMiddleware,
  roleCheck("national"),
  deleteVaccineSchedule
);

// 📤 Export PDF
router.get(
  "/export/pdf",
  authMiddleware,
  roleCheck("national"),
  exportVaccineSchedulePdf
);

export default router;
