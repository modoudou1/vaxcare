import express, { Request, Response } from "express";
import { authMiddleware, roleCheck } from "../middleware/auth";
import {
  getAppointmentsTodayByHealthCenter,
  getVaccinationsTodayByAgent,
  getNotificationsTodayByAgent,
  getLowStocksByHealthCenter,
  getExpiringStocksByHealthCenter,
  getCoverage7Days,
} from "../controllers/agentMetricsController";

const router = express.Router();

// KPIs today
router.get(
  "/appointments/agent/today",
  authMiddleware as unknown as express.RequestHandler,
  roleCheck("agent", "regional", "national") as unknown as express.RequestHandler,
  (req: Request, res: Response) => getAppointmentsTodayByHealthCenter(req, res)
);

router.get(
  "/vaccinations/agent/today",
  authMiddleware as unknown as express.RequestHandler,
  roleCheck("agent", "regional", "national") as unknown as express.RequestHandler,
  (req: Request, res: Response) => getVaccinationsTodayByAgent(req, res)
);

router.get(
  "/notifications/agent/today",
  authMiddleware as unknown as express.RequestHandler,
  roleCheck("agent", "regional", "national") as unknown as express.RequestHandler,
  (req: Request, res: Response) => getNotificationsTodayByAgent(req, res)
);

// Stocks
router.get(
  "/stocks/agent",
  authMiddleware as unknown as express.RequestHandler,
  roleCheck("agent", "regional", "national") as unknown as express.RequestHandler,
  (req: Request, res: Response) => getLowStocksByHealthCenter(req, res)
);

router.get(
  "/stocks/expiring",
  authMiddleware as unknown as express.RequestHandler,
  roleCheck("agent", "regional", "national") as unknown as express.RequestHandler,
  (req: Request, res: Response) => getExpiringStocksByHealthCenter(req, res)
);

// Coverage 7 days
router.get(
  "/dashboard/agent/:agentId/coverage",
  authMiddleware as unknown as express.RequestHandler,
  roleCheck("agent", "regional", "national") as unknown as express.RequestHandler,
  (req: Request, res: Response) => getCoverage7Days(req, res)
);

export default router;
