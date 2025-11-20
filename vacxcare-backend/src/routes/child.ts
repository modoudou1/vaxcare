import { Router } from "express";
import {
  attachExistingChild,
  createChild,
  deleteChild,
  getChildById,
  getChildren,
  updateChild,
  verifyChildByPhone,
  getChildProfile,
  addVaccination,
  updateMedicalInfo,
  updateParentInfo,
  getChildCompletionRate,
} from "../controllers/childController";
import { authMiddleware, roleCheck } from "../middleware/auth";

const router = Router();

/* -------------------------------------------------------------------------- */
/* 🧒 ROUTES ENFANT                                                          */
/* -------------------------------------------------------------------------- */

// ➕ Créer un enfant
router.post("/", authMiddleware, roleCheck("agent", "district"), createChild as any);

// 📋 Lister tous les enfants
router.get(
  "/",
  authMiddleware,
  roleCheck("agent", "district", "regional", "national"),
  getChildren as any
);

// 📊 Vue par district pour régional
// TEMPORAIREMENT COMMENTÉ - À DEBUGGER
// router.get(
//   "/by-district/stats",
//   authMiddleware,
//   roleCheck("regional"),
//   getChildrenByDistrict as any
// );

// 🔎 Obtenir le détail d’un enfant par ID
router.get(
  "/:id",
  authMiddleware,
  roleCheck("agent", "district", "regional", "national"),
  getChildById as any
);

// ✏️ Modifier un enfant (PUT ou PATCH)
router.put("/:id", authMiddleware, roleCheck("agent", "district"), updateChild as any);
router.patch("/:id", authMiddleware, roleCheck("agent", "district"), updateChild as any);

// ❌ Supprimer un enfant
router.delete("/:id", authMiddleware, roleCheck("agent", "district"), deleteChild as any);

// ✅ Vérification publique via lien (mobile)
router.get("/link/:id", verifyChildByPhone);

// 📌 Attacher un enfant existant à un agent
router.post(
  "/attach-existing",
  authMiddleware,
  roleCheck("agent", "district"),
  attachExistingChild as any
);

/* -------------------------------------------------------------------------- */
/* 👶 ROUTES PROFIL COMPLET ENFANT                                           */
/* -------------------------------------------------------------------------- */

// 📋 Profil complet d'un enfant
router.get(
  "/:id/profile",
  authMiddleware,
  roleCheck("agent", "district", "regional", "national"),
  getChildProfile as any
);

// 💉 Ajouter une vaccination
router.post(
  "/:id/vaccinations",
  authMiddleware,
  roleCheck("agent", "district"),
  addVaccination as any
);

// 🩺 Mettre à jour les informations médicales
router.put(
  "/:id/medical",
  authMiddleware,
  roleCheck("agent", "district"),
  updateMedicalInfo as any
);

// 👨‍👩‍👧‍👦 Mettre à jour les informations parent
router.put(
  "/:id/parent",
  authMiddleware,
  roleCheck("agent", "district"),
  updateParentInfo as any
);

// 📊 Obtenir le taux de complétion vaccinal d'un enfant
router.get(
  "/:id/completion-rate",
  authMiddleware,
  roleCheck("agent", "district", "regional", "national", "user"),
  getChildCompletionRate as any
);

/* -------------------------------------------------------------------------- */
/* 📦 EXPORT                                                                 */
/* -------------------------------------------------------------------------- */
export default router;
