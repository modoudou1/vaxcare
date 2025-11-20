import express from "express";
import {
  getSystemSettings,
  updateSystemSettings,
  uploadSystemLogo,
  getAuditLogs,
  generateApiKey,
  getApiKeys,
  revokeApiKey,
  createBackup,
  toggleMaintenanceMode,
  getSystemStats,
  updateNotificationSettings,
} from "../controllers/systemSettingsController";
import { authMiddleware, roleCheck } from "../middleware/auth";
import multer from "multer";
import fs from "fs";
import path from "path";

const router = express.Router();

// 📂 Config Multer stockage dans /uploads (racine du projet)
const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = ["image/png", "application/pdf"]; // PNG & PDF
  if (allowed.includes(file.mimetype)) return cb(null, true);
  return cb(new Error("Type de fichier non supporté. PNG ou PDF requis."));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * @swagger
 * tags:
 *   name: SystemSettings
 *   description: Paramètres globaux du système
 */

// 🔹 Récupérer les paramètres (public pour le logo et le thème, auth requis pour les autres)
router.get("/", getSystemSettings);

// 🔹 Mettre à jour les paramètres (seul national peut modifier)
router.put("/", authMiddleware, roleCheck("national"), updateSystemSettings);

// 🔹 Upload du logo (PNG/PDF) -> retourne l'URL et met à jour logoUrl
router.post(
  "/upload-logo",
  authMiddleware,
  roleCheck("national"),
  upload.single("file"),
  uploadSystemLogo
);

// 🔹 Upload des images d'onboarding (PNG/JPG)
router.post(
  "/upload-onboarding-image",
  authMiddleware,
  roleCheck("national"),
  upload.single("file"),
  async (req, res) => {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      const { slideNumber } = req.body;
      
      if (!file) {
        return res.status(400).json({ error: "Aucun fichier reçu" });
      }
      
      if (!slideNumber || !["1", "2", "3"].includes(slideNumber)) {
        return res.status(400).json({ error: "Numéro de slide invalide (1, 2 ou 3)" });
      }

      const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
      const publicUrl = `${baseUrl}/uploads/${file.filename}`;
      
      const fieldName = `onboardingSlide${slideNumber}Image`;
      const settings = await (await import("../models/SystemSettings")).default.findOneAndUpdate(
        {},
        { [fieldName]: publicUrl },
        { new: true, upsert: true }
      );

      return res.json({ message: "Image uploadée", url: publicUrl, settings });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// 🔹 Upload des images de dashboard slides (PNG/JPG)
router.post(
  "/upload-dashboard-slide-image",
  authMiddleware,
  roleCheck("national"),
  upload.single("file"),
  async (req, res) => {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      const { slideNumber } = req.body;
      
      if (!file) {
        return res.status(400).json({ error: "Aucun fichier reçu" });
      }
      
      if (!slideNumber || !["1", "2", "3"].includes(slideNumber)) {
        return res.status(400).json({ error: "Numéro de slide invalide (1, 2 ou 3)" });
      }

      const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
      const publicUrl = `${baseUrl}/uploads/${file.filename}`;
      
      const fieldName = `dashboardSlide${slideNumber}Image`;
      const settings = await (await import("../models/SystemSettings")).default.findOneAndUpdate(
        {},
        { [fieldName]: publicUrl },
        { new: true, upsert: true }
      );

      return res.json({ message: "Image dashboard uploadée", url: publicUrl, settings });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// 🔹 Logs d'audit
router.get("/audit-logs", authMiddleware, roleCheck("national"), getAuditLogs);

// 🔹 Clés API
router.get("/api-keys", authMiddleware, roleCheck("national"), getApiKeys);
router.post("/api-keys", authMiddleware, roleCheck("national"), generateApiKey);
router.delete("/api-keys/:id", authMiddleware, roleCheck("national"), revokeApiKey);

// 🔹 Sauvegardes
router.post("/backup", authMiddleware, roleCheck("national"), createBackup);

// 🔹 Mode maintenance
router.post("/maintenance", authMiddleware, roleCheck("national"), toggleMaintenanceMode);

// 🔹 Statistiques système
router.get("/stats", authMiddleware, roleCheck("national"), getSystemStats);

// 🔹 Paramètres de notification
router.put("/notifications", authMiddleware, roleCheck("national"), updateNotificationSettings);

export default router;