import express from "express";
import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
  getUserRoles,
  updateUserRoles,
  changePassword,
} from "../controllers/userController";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

// ✅ Changement de mot de passe (DOIT être avant les routes avec :id)
router.put("/change-password", authMiddleware, changePassword);

// ✅ Liste et gestion des utilisateurs
router.get("/", authMiddleware, getUsers);
router.get("/:id", authMiddleware, getUserById);
router.post("/", authMiddleware, createUser);
router.put("/:id", authMiddleware, updateUser);
router.delete("/:id", authMiddleware, deleteUser);

// ✅ Rôles & Permissions
router.get("/:id/roles", authMiddleware, getUserRoles);
router.put("/:id/roles", authMiddleware, updateUserRoles);

export default router; 