import express from "express";
import { 
  getNationalReport, 
  exportNationalReportPDF,
  getRegionDetailedStats,
  getDistrictDetailedStats,
  getHealthCenterDetailedStats,
  getVaccineDetailedStats,
  getPerformanceIndicators
} from "../controllers/reportController";
import { authMiddleware, roleCheck } from "../middleware/auth";

const router = express.Router();

// Routes existantes
router.get(
  "/national",
  authMiddleware,
  roleCheck("national"),
  getNationalReport
);

router.get(
  "/national/pdf",
  authMiddleware,
  roleCheck("national"),
  exportNationalReportPDF
);

// 🆕 Nouvelles routes pour statistiques avancées
router.get(
  "/region/:regionName",
  authMiddleware,
  roleCheck("national", "regional"),
  getRegionDetailedStats
);

router.get(
  "/district/:regionName/:districtName",
  authMiddleware,
  roleCheck("national", "regional", "district"),
  getDistrictDetailedStats
);

router.get(
  "/healthcenter/:regionName/:districtName/:healthCenterName",
  authMiddleware,
  roleCheck("national", "regional", "district", "agent"),
  getHealthCenterDetailedStats
);

router.get(
  "/vaccines",
  authMiddleware,
  roleCheck("national"),
  getVaccineDetailedStats
);

router.get(
  "/performance",
  authMiddleware,
  roleCheck("national"),
  getPerformanceIndicators
);

export default router;