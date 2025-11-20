import { Router } from "express";
import { 
  linkChildByIdAndPhone,
  searchParentByPhoneAndName,
  getChildrenByParentPhone,
  linkSelectedChild
} from "../controllers/linkChildController";

const router = Router();

// Route pour lier un enfant existant par ID et numéro de téléphone (ancienne méthode)
router.post("/link", linkChildByIdAndPhone);

// Nouvelles routes pour la liaison améliorée
router.post("/search-parent", searchParentByPhoneAndName);  // Rechercher parent par téléphone + nom
router.get("/parent-children", getChildrenByParentPhone);  // Lister les enfants du parent
router.post("/link-selected", linkSelectedChild);  // Lier l'enfant sélectionné

export default router;