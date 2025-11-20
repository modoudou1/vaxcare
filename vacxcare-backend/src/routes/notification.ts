import express from "express";
import {
  createNotification,
  getNotifications,
  markAsRead,
  deleteNotification,
  purgeNotifications,
  // ⭐ Ajouts
  hideForMe,
  hideAllForMe,
} from "../controllers/notificationController";
import { authMiddleware, roleCheck } from "../middleware/auth";
import { sendSocketNotification } from "../utils/socketManager";
import { getRecentNotifications } from "../controllers/notificationController";

import { io } from "../server";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Gestion des notifications multi-rôles
 */

// 📬 Lire ses notifications (tous rôles)
router.get("/", authMiddleware, getNotifications);

// 🟢 Créer une notification (réservé national/admin)
router.post(
  "/",
  authMiddleware,
  roleCheck("national", "admin"),
  createNotification
);

// 🧾 Marquer comme lue
router.put("/:id/read", authMiddleware, markAsRead);

// ⭐ Masquer une notification pour moi (soft delete)
router.post("/:id/hide", authMiddleware, hideForMe);

// ⭐ Masquer tout mon historique (soft delete)
router.post("/hide-all", authMiddleware, hideAllForMe);

// 🗑️ Supprimer une notification (admin ou national)
router.delete(
  "/:id",
  authMiddleware,
  roleCheck("national", "admin"),
  deleteNotification
);

router.get("/recent", authMiddleware, getRecentNotifications);

// 🧹 Purge totale (DEV UNIQUEMENT)
router.delete("/", authMiddleware, roleCheck("admin"), purgeNotifications);

// 🧪 Route de test Socket.io (DEV)
router.get("/test/socket", (_req, res) => {
  const notif = {
    title: "Test direct",
    message: "Hello socket",
    targetRoles: ["agent"],
  } as any;
  sendSocketNotification(io, notif.targetRoles, notif);
  res.json({ ok: true });
});

export default router;
