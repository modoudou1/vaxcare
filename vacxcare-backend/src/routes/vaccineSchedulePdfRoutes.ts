import { Router } from "express";
import { exportVaccineSchedulePdf } from "../controllers/vaccineSchedulePdfController";
import { authMiddleware, roleCheck } from "../middleware/auth";

const router = Router();

// 📤 Export PDF du calendrier vaccinal (National uniquement)
router.get(
  "/export/pdf",
  authMiddleware,
  roleCheck("national"),
  exportVaccineSchedulePdf
);

export default router;
