import express from "express";
import {
  completeAppointment,
  createAppointment,
  deleteAppointment,
  getAppointmentById,
  getAppointments,
  getMyAppointments,
  updateAppointment,
  missAppointment,
  cancelAppointment,
} from "../controllers/appointmentController";
import { authMiddleware, roleCheck } from "../middleware/auth";
import Appointment from "../models/Appointment";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Gestion des rendez-vous (agents, régions, nationaux)
 */

/* -------------------------------------------------------------------------- */
/* ➕ POST /api/appointments : création par un agent                          */
/* -------------------------------------------------------------------------- */
router.post("/", authMiddleware, roleCheck("agent", "district"), createAppointment);

/* -------------------------------------------------------------------------- */
/* 📋 GET /api/appointments : liste selon le rôle                            */
/* -------------------------------------------------------------------------- */
router.get(
  "/",
  authMiddleware,
  roleCheck("national", "regional", "district", "agent"),
  getAppointments
);

/* -------------------------------------------------------------------------- */
/* 👤 GET /api/appointments/my : liste des rendez-vous de l’agent connecté    */
/* -------------------------------------------------------------------------- */
router.get("/my", authMiddleware, roleCheck("agent", "district"), getMyAppointments);

/* -------------------------------------------------------------------------- */
/* ✅ PUT /api/appointments/:id/complete : marquer comme fait                */
/* -------------------------------------------------------------------------- */
router.put(
  "/:id/complete",
  authMiddleware,
  roleCheck("agent", "district"),
  completeAppointment
);

/* -------------------------------------------------------------------------- */
/* ⚠️ PUT /api/appointments/:id/miss : marquer comme raté                    */
/* -------------------------------------------------------------------------- */
router.put(
  "/:id/miss",
  authMiddleware,
  roleCheck("agent", "district"),
  missAppointment
);

/* -------------------------------------------------------------------------- */
/* 🚫 PUT /api/appointments/:id/cancel : marquer comme annulé                */
/* -------------------------------------------------------------------------- */
router.put(
  "/:id/cancel",
  authMiddleware,
  roleCheck("agent", "district"),
  cancelAppointment
);

/* -------------------------------------------------------------------------- */
/* 🔎 GET /api/appointments/:id : détail d'un rendez-vous                    */
/* -------------------------------------------------------------------------- */
router.get(
  "/:id",
  authMiddleware,
  roleCheck("national", "regional", "district", "agent"),
  getAppointmentById
);

/* -------------------------------------------------------------------------- */
/* ✏️ PUT /api/appointments/:id : mise à jour                                */
/* -------------------------------------------------------------------------- */
router.put("/:id", authMiddleware, roleCheck("agent", "district"), updateAppointment);

/* -------------------------------------------------------------------------- */
/* ❌ DELETE /api/appointments/:id : suppression                             */
/* -------------------------------------------------------------------------- */
router.delete("/:id", authMiddleware, roleCheck("agent", "district"), deleteAppointment);

/* -------------------------------------------------------------------------- */
/* 🧹 [OPTIONNEL] Route ADMIN : suppression des anciens rendez-vous ObjectId */
/* -------------------------------------------------------------------------- */
/**
 * Cette route est temporaire, uniquement pour nettoyer la base
 * après migration. Elle supprime les anciens rendez-vous
 * dont `healthCenter` est un ObjectId au lieu d’un nom de centre.
 */
router.delete(
  "/admin/fix-old",
  authMiddleware,
  roleCheck("national"),
  async (req, res) => {
    try {
      const result = await Appointment.deleteMany({
        healthCenter: { $regex: /^[0-9a-fA-F]{24}$/ },
      });
      res.json({
        message: `🧹 ${result.deletedCount} anciens rendez-vous supprimés`,
      });
    } catch (err: any) {
      console.error("❌ Erreur nettoyage rendez-vous:", err.message);
      res.status(500).json({ error: "Erreur serveur", details: err.message });
    }
  }
);

export default router;
