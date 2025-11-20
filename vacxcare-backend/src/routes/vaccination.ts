import express from "express";
import {
  addVaccination,
  completeVaccination,
  deleteVaccination,
  getAllVaccinations,
  getVaccinationAndAppointmentsByChild,
  getVaccinationsByChild,
  markVaccinationMissed,
  scheduleVaccination,
  updateVaccination,
  cancelVaccination,
  getVaccinationRecord,
  rescheduleVaccination,
} from "../controllers/vaccinationController";
import { authMiddleware, roleCheck } from "../middleware/auth";
import Vaccination from "../models/Vaccination";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* 🩹 ROUTES TEMPORAIRES (à mettre AVANT les routes dynamiques)              */
/* -------------------------------------------------------------------------- */

// 🔍 Vérifier les données existantes
router.get("/check-health-data", authMiddleware, async (req, res) => {
  try {
    const docs = await Vaccination.find(
      {},
      { healthCenter: 1, region: 1, status: 1 }
    ).limit(10);
    res.json(docs);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 🩹 Corriger les anciens vaccins sans healthCenter/region
router.put("/fix-old-health-data", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user?.healthCenter || !user?.region) {
      return res
        .status(400)
        .json({ message: "Utilisateur invalide ou sans healthCenter/region" });
    }

    const result = await Vaccination.updateMany(
      {
        $or: [
          { healthCenter: { $exists: false } },
          { healthCenter: "" },
          { region: { $exists: false } },
          { region: "" },
        ],
      },
      {
        $set: {
          healthCenter: user.healthCenter,
          region: user.region,
        },
      }
    );

    res.json({
      message: `✅ ${result.modifiedCount} vaccinations mises à jour.`,
      appliedValues: {
        healthCenter: user.healthCenter,
        region: user.region,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/* 🟩 ROUTES PRINCIPALES VACCINATION                                         */
/* -------------------------------------------------------------------------- */

router.get(
  "/",
  authMiddleware,
  roleCheck("agent", "regional", "national", "district"),
  getAllVaccinations
);

router.get(
  "/child/:childId",
  authMiddleware,
  roleCheck("agent", "regional", "national", "district"),
  getVaccinationsByChild
);

router.post(
  "/",
  authMiddleware,
  roleCheck("agent", "regional", "district"),
  addVaccination
);

router.post(
  "/schedule",
  authMiddleware,
  roleCheck("agent", "regional", "district"),
  scheduleVaccination
);

router.put(
  "/:id/complete",
  authMiddleware,
  roleCheck("agent", "regional", "district"),
  completeVaccination
);

router.put(
  "/:id/missed",
  authMiddleware,
  roleCheck("agent", "regional", "district"),
  markVaccinationMissed
);

router.put(
  "/:id/cancel",
  authMiddleware,
  roleCheck("agent", "regional", "district"),
  cancelVaccination
);

router.put(
  "/:id/reschedule",
  authMiddleware,
  roleCheck("agent", "regional", "district"),
  rescheduleVaccination
);

router.put(
  "/:id",
  authMiddleware,
  roleCheck("agent", "regional", "district"),
  updateVaccination
);

router.delete(
  "/:id",
  authMiddleware,
  roleCheck("agent", "regional", "national", "district"),
  deleteVaccination
);

router.get("/public-api/child/:childId", getVaccinationAndAppointmentsByChild);

// Route pour récupérer le carnet de vaccination complet d'un enfant
router.get("/record/:childId", authMiddleware, roleCheck("agent", "regional", "national", "district"), getVaccinationRecord);

/* -------------------------------------------------------------------------- */
/* 🧱 EXPORT                                                                 */
/* -------------------------------------------------------------------------- */
export default router;
