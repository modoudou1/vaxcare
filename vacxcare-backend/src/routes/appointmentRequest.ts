import { Router, Request, Response } from "express";
import {
  searchAvailableCenters,
  createAppointmentRequest,
  getIncomingRequests,
  acceptAppointmentRequest,
  rejectAppointmentRequest,
  getParentRequests,
} from "../controllers/appointmentRequestController";
import { authMiddleware, roleCheck } from "../middleware/auth";

const router = Router();

/* -------------------------------------------------------------------------- */
/* 🔍 Routes publiques (pour mobile parents)                                */
/* -------------------------------------------------------------------------- */

// Rechercher centres avec stock disponible
router.get("/available-centers", searchAvailableCenters);

// Créer une demande de rendez-vous (parent mobile)
router.post("/create", authMiddleware, createAppointmentRequest);

// Récupérer les demandes d'un parent (mobile)
router.get("/parent/:childId", authMiddleware, getParentRequests);

/* -------------------------------------------------------------------------- */
/* 👨‍⚕️ Routes pour agents (dashboard web)                                    */
/* -------------------------------------------------------------------------- */

// Test auth endpoint
router.get(
  "/test-auth",
  authMiddleware,
  (req: Request, res: Response) => {
    const user = req.user;
    res.json({
      success: true,
      user: {
        id: user?.id,
        role: user?.role,
        healthCenter: user?.healthCenter,
        region: user?.region,
      },
    });
  }
);

// Récupérer les demandes reçues (agents)
router.get(
  "/incoming",
  authMiddleware,
  roleCheck("agent", "district", "regional", "national"),
  getIncomingRequests
);

// Accepter une demande
router.put(
  "/:requestId/accept",
  authMiddleware,
  roleCheck("agent", "district", "regional", "national"),
  acceptAppointmentRequest
);

// Refuser une demande
router.put(
  "/:requestId/reject",
  authMiddleware,
  roleCheck("agent", "district", "regional", "national"),
  rejectAppointmentRequest
);

export default router;
