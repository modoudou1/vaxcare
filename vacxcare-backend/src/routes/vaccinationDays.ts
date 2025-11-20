import express from 'express';
import { authMiddleware, roleCheck } from '../middleware/auth';
import {
  saveVaccinationDays,
  getVaccinationDays,
  getDistrictVaccinationDays,
  deleteVaccinationDays
} from '../controllers/vaccinationDaysController';

const router = express.Router();

// Routes pour la gestion des jours de vaccination
// Toutes les routes nécessitent une authentification

// POST /api/vaccination-days - Créer/mettre à jour les jours de vaccination
router.post('/', 
  authMiddleware, 
  roleCheck('district', 'agent'), 
  saveVaccinationDays
);

// GET /api/vaccination-days - Récupérer ses propres jours de vaccination
router.get('/', 
  authMiddleware, 
  roleCheck('district', 'agent'), 
  getVaccinationDays
);

// GET /api/vaccination-days/district/:district - Récupérer les plannings d'un district (pour régionaux)
router.get('/district/:district', 
  authMiddleware, 
  roleCheck('regional'), 
  getDistrictVaccinationDays
);

// DELETE /api/vaccination-days - Supprimer son planning de vaccination
router.delete('/', 
  authMiddleware, 
  roleCheck('district', 'agent'), 
  deleteVaccinationDays
);

export default router;
