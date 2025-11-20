import { Request, Response } from "express";
import mongoose from "mongoose";
import Appointment from "../models/Appointment";
import Vaccination from "../models/Vaccination";
import Notification from "../models/Notification";
import Stock from "../models/Stock";
import Child from "../models/Child";
import HealthCenter from "../models/HealthCenter";

// Helpers
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

// 1) Rendez-vous prévus aujourd'hui par centre
export const getAppointmentsTodayByHealthCenter = async (req: Request, res: Response) => {
  try {
    const { healthCenter } = req.query as { healthCenter?: string };
    if (!healthCenter) {
      return res.status(400).json({ success: false, message: "healthCenter requis" });
    }

    // HealthCenter is an ObjectId in Appointment schema
    const hcDoc = await HealthCenter.findOne({ name: healthCenter });
    if (!hcDoc) return res.json({ count: 0 });

    const count = await Appointment.countDocuments({
      healthCenter: new mongoose.Types.ObjectId(String(hcDoc._id)),
      date: { $gte: startOfToday(), $lte: endOfToday() },
      status: { $in: ["planned", "pending", "confirmed"] },
    });
    return res.json({ count });
  } catch (e) {
    console.error("getAppointmentsTodayByHealthCenter error", e);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// 2) Vaccinations saisies aujourd'hui par agent (via enfants créés par l'agent)
export const getVaccinationsTodayByAgent = async (req: Request, res: Response) => {
  try {
    const { agentId } = req.query as { agentId?: string };
    if (!agentId) return res.status(400).json({ success: false, message: "agentId requis" });

    const agentObjectId = new mongoose.Types.ObjectId(agentId);
    const countAgg = await Vaccination.aggregate([
      {
        $match: { date: { $gte: startOfToday(), $lte: endOfToday() } },
      },
      {
        $lookup: { from: "children", localField: "child", foreignField: "_id", as: "childInfo" },
      },
      { $unwind: "$childInfo" },
      { $match: { "childInfo.createdBy": agentObjectId } },
      { $count: "count" },
    ]);
    const count = countAgg[0]?.count || 0;
    return res.json({ count });
  } catch (e) {
    console.error("getVaccinationsTodayByAgent error", e);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// 3) Notifications envoyées aujourd'hui par agent
export const getNotificationsTodayByAgent = async (req: Request, res: Response) => {
  try {
    const { agentId } = req.query as { agentId?: string };
    if (!agentId) return res.status(400).json({ success: false, message: "agentId requis" });

    const count = await Notification.countDocuments({
      user: new mongoose.Types.ObjectId(agentId),
      createdAt: { $gte: startOfToday(), $lte: endOfToday() },
    });
    return res.json({ count });
  } catch (e) {
    console.error("getNotificationsTodayByAgent error", e);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// 4) Stocks faibles par centre (threshold par défaut 30)
export const getLowStocksByHealthCenter = async (req: Request, res: Response) => {
  try {
    const { healthCenter, threshold } = req.query as { healthCenter?: string; threshold?: string };
    if (!healthCenter) return res.status(400).json({ success: false, message: "healthCenter requis" });
    const thr = Number(threshold ?? 30);

    const low = await Stock.aggregate([
      { $match: { healthCenter } },
      {
        $project: {
          vaccine: 1,
          batchNumber: 1,
          remaining: "$quantity",
          threshold: { $literal: thr },
          isLow: { $lt: ["$quantity", thr] },
        },
      },
      { $match: { isLow: true } },
    ]);
    return res.json({ low });
  } catch (e) {
    console.error("getLowStocksByHealthCenter error", e);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// 5) Vaccins expirant N jours (par défaut 14)
export const getExpiringStocksByHealthCenter = async (req: Request, res: Response) => {
  try {
    const { healthCenter, days } = req.query as { healthCenter?: string; days?: string };
    if (!healthCenter) return res.status(400).json({ success: false, message: "healthCenter requis" });
    const horizon = Number(days ?? 14);
    const now = new Date();
    const limit = new Date(now.getTime() + horizon * 24 * 60 * 60 * 1000);

    const expiring = await Stock.aggregate([
      { $match: { healthCenter } },
      { $match: { expirationDate: { $gte: now, $lte: limit } } },
      {
        $project: {
          vaccine: 1,
          lot: "$batchNumber",
          expiresInDays: {
            $ceil: { $divide: [{ $subtract: ["$expirationDate", now] }, 1000 * 60 * 60 * 24] },
          },
        },
      },
      { $sort: { expiresInDays: 1 } },
    ]);
    return res.json({ expiring });
  } catch (e) {
    console.error("getExpiringStocksByHealthCenter error", e);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// 6) Couverture 7 jours (doses par jour) pour un agent
export const getCoverage7Days = async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params as { agentId: string };
    const agentObjectId = new mongoose.Types.ObjectId(agentId);

    const end = endOfToday();
    const start = new Date(end);
    start.setDate(start.getDate() - 6);

    const data = await Vaccination.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $lookup: { from: "children", localField: "child", foreignField: "_id", as: "childInfo" } },
      { $unwind: "$childInfo" },
      { $match: { "childInfo.createdBy": agentObjectId } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          doses: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Ensure all 7 days are present
    const map = new Map<string, number>();
    data.forEach((d) => map.set(d._id as string, d.doses as number));
    const days: { day: string; doses: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(end);
      dt.setDate(end.getDate() - i);
      const key = dt.toISOString().slice(0, 10);
      days.push({ day: key, doses: map.get(key) ?? 0 });
    }

    return res.json(days);
  } catch (e) {
    console.error("getCoverage7Days error", e);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};
