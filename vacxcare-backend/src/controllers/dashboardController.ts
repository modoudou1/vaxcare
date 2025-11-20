import { Request, Response } from "express";
import Appointment from "../models/Appointment";
import Campaign from "../models/Campaign";
import Child from "../models/Child";
import Notification from "../models/Notification";
import Stock from "../models/Stock";
import Vaccination from "../models/Vaccination";

/* -------------------------------------------------------------------------- */
/* 🔧 Fonction utilitaire pour gérer les filtres période/date ---------------- */
/* -------------------------------------------------------------------------- */
function getDateRange(period?: string, date?: string) {
  const now = date ? new Date(date) : new Date();
  let startFilter: Date | null = null;
  let endFilter: Date | null = null;

  switch (period) {
    case "week": {
      const day = now.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      startFilter = new Date(now);
      startFilter.setDate(now.getDate() + diff);
      startFilter.setHours(0, 0, 0, 0);
      endFilter = new Date(startFilter);
      endFilter.setDate(startFilter.getDate() + 6);
      endFilter.setHours(23, 59, 59, 999);
      break;
    }
    case "month":
      startFilter = new Date(now.getFullYear(), now.getMonth(), 1);
      endFilter = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      break;
    case "year":
      startFilter = new Date(now.getFullYear(), 0, 1);
      endFilter = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      startFilter = null;
      endFilter = null;
      break;
  }

  return { startFilter, endFilter };
}

/* -------------------------------------------------------------------------- */
/* 🟩 DASHBOARD AGENT -------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
export const getAgentDashboard = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res.status(401).json({ error: "Utilisateur non authentifié" });

    const healthCenter =
      typeof user.healthCenter === "string"
        ? user.healthCenter.trim()
        : (user.healthCenter?.name ?? "").trim();

    const { period, date } = req.query;
    const { startFilter, endFilter } = getDateRange(
      period as string,
      date as string
    );

    const dateFilter =
      startFilter && endFilter
        ? { date: { $gte: startFilter, $lte: endFilter } }
        : {};
    const doneDateFilter =
      startFilter && endFilter
        ? { doneDate: { $gte: startFilter, $lte: endFilter } }
        : {};

    /* 👶 Total enfants */
    const totalChildren = await Child.countDocuments({
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
    });

    /* 📅 Rendez-vous du jour */
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const appointmentsToday = await Appointment.countDocuments({
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
      date: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ["planned", "pending", "confirmed"] },
    });

    /* 🗓️ Rendez-vous prévus */
    const totalAppointmentsPlanned = await Appointment.countDocuments({
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
      status: { $in: ["planned", "pending", "confirmed"] },
      ...dateFilter,
    });

    /* 💉 Vaccinations saisies */
    const vaccinationsSaisies = await Vaccination.countDocuments({
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
      status: "done",
      ...doneDateFilter,
    });

    /* 🔔 Rappels envoyés */
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const remindersSent = await Notification.countDocuments({
      type: "vaccination",
      createdAt: { $gte: sevenDaysAgo },
      $or: [
        { targetRoles: { $in: ["agent", "all"] } },
        { targetUsers: user._id },
      ],
    });

    /* 📦 Stocks faibles */
    const lowStocks = await Stock.find({
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
      quantity: { $lt: 10 },
    }).select("vaccine quantity");

    const lowStocksFormatted = lowStocks.map((s) => ({
      vaccine: s.vaccine,
      remaining: s.quantity,
    }));

    /* ⏰ Lots expirant */
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const expiringLots = await Stock.find({
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
      expirationDate: { $lte: soon },
    }).select("vaccine batchNumber expirationDate");

    const expiringLotsFormatted = expiringLots.map((lot) => ({
      vaccine: lot.vaccine,
      lot: lot.batchNumber,
      expiresInDays: Math.max(
        0,
        Math.ceil(
          (lot.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      ),
    }));

    /* 📊 Doses dynamiques */
    let dosesPerDayRaw: { _id: number | string; value: number }[] = [];
    let dosesPerDay: { day: string; value: number }[] = [];
    const matchFilter = {
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
      status: "done",
      ...(doneDateFilter.doneDate ? doneDateFilter : {}),
    };

    if (period === "week") {
      dosesPerDayRaw = await Vaccination.aggregate([
        { $match: matchFilter },
        { $group: { _id: { $dayOfWeek: "$doneDate" }, value: { $sum: 1 } } },
      ]);
      const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      dosesPerDay = days.map((day, i) => ({
        day,
        value: dosesPerDayRaw.find((d) => d._id === i + 1)?.value || 0,
      }));
    } else if (period === "month") {
      dosesPerDayRaw = await Vaccination.aggregate([
        { $match: matchFilter },
        { $group: { _id: { $dayOfMonth: "$doneDate" }, value: { $sum: 1 } } },
      ]);
      const lastDay = endFilter?.getDate() ?? 30;
      dosesPerDay = Array.from({ length: lastDay }, (_, i) => ({
        day: (i + 1).toString(),
        value: dosesPerDayRaw.find((d) => d._id === i + 1)?.value || 0,
      }));
    } else if (period === "year") {
      dosesPerDayRaw = await Vaccination.aggregate([
        { $match: matchFilter },
        { $group: { _id: { $month: "$doneDate" }, value: { $sum: 1 } } },
      ]);
      const months = [
        "Jan",
        "Fév",
        "Mar",
        "Avr",
        "Mai",
        "Juin",
        "Juil",
        "Août",
        "Sep",
        "Oct",
        "Nov",
        "Déc",
      ];
      dosesPerDay = months.map((month, i) => ({
        day: month,
        value: dosesPerDayRaw.find((d) => d._id === i + 1)?.value || 0,
      }));
    } else if (period === "all") {
      dosesPerDayRaw = await Vaccination.aggregate([
        {
          $match: {
            healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
            status: "done",
          },
        },
        { $group: { _id: { $year: "$doneDate" }, value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      dosesPerDay = dosesPerDayRaw.map((d) => ({
        day: d._id.toString(),
        value: d.value,
      }));
    } else {
      const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      dosesPerDay = days.map((day) => ({ day, value: 0 }));
    }

    res.json({
      totalChildren,
      appointmentsToday,
      totalAppointmentsPlanned,
      vaccinationsSaisies,
      remindersSent,
      lowStocks: lowStocksFormatted,
      expiringLots: expiringLotsFormatted,
      dosesPerDay,
    });
  } catch (err) {
    console.error("❌ Erreur Dashboard agent:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

/* -------------------------------------------------------------------------- */
/* 🟦 DASHBOARD NATIONAL ----------------------------------------------------- */
/* -------------------------------------------------------------------------- */
export const getNationalDashboard = async (req: Request, res: Response) => {
  try {
    const { period, date } = req.query;
    const { startFilter, endFilter } = getDateRange(
      period as string,
      date as string
    );

    const doneDateFilter =
      startFilter && endFilter
        ? { doneDate: { $gte: startFilter, $lte: endFilter } }
        : {};

    const totalChildren = await Child.countDocuments();
    const totalVaccinations = await Vaccination.countDocuments();

    const vaccinationsSaisies = await Vaccination.countDocuments({
      status: "done",
      ...doneDateFilter,
    });

    const vaccinatedChildren = await Vaccination.distinct("child", {
      status: "done",
      ...doneDateFilter,
    }).then((children) => children.length);

    const coverageRate =
      totalChildren > 0
        ? Number(((vaccinatedChildren / totalChildren) * 100).toFixed(2))
        : 0;

    const today = new Date();
    const campaigns = await Campaign.countDocuments({
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    // 1) Évolution nationale (normalisée pour { month, value })
  // 1) Évolution nationale (normalisée pour { month, value })
let agg: any[] = [];
if (period === "all") {
      agg = [
        { $match: { status: "done" } },
        { $group: { _id: { $year: "$doneDate" }, value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ];
    } else {
      agg = [
        { $match: { status: "done", ...doneDateFilter } },
        { $group: { _id: { $month: "$doneDate" }, value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ];
    }

    const monthlyRaw = await Vaccination.aggregate(agg);
    const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
   const monthlyVaccinations =
  period === "all"
    ? monthlyRaw.map((d: any) => ({ month: String(d._id), value: d.value }))
    : (() => {
        const byMonth: Record<number, number> = {};
        for (const doc of monthlyRaw) {
          byMonth[doc._id as number] = doc.value as number;
        }
        return Array.from({ length: 12 }, (_, i) => ({
          month: MONTHS[i],
          value: byMonth[i + 1] || 0,
        }));
      })();

    // 2) Répartition par vaccin (national)
    const coverageByVaccine = await Vaccination.aggregate([
      { $match: { status: "done", ...(doneDateFilter.doneDate ? doneDateFilter : {}) } },
      {
        $lookup: {
          from: "vaccines",
          localField: "vaccine",
          foreignField: "_id",
          as: "vaccineInfo",
        },
      },
      { $unwind: "$vaccineInfo" },
      { $group: { _id: "$vaccineInfo.name", value: { $sum: 1 } } },
      { $project: { name: "$_id", value: 1, _id: 0 } },
      { $sort: { value: -1 } },
    ]);

    // 3) Top 5 régions en retard (national)
    const topRegions = await Child.aggregate([
      {
        $lookup: {
          from: "vaccinations",
          localField: "_id",
          foreignField: "child",
          as: "vaccinations",
        },
      },
      {
       $group: {
  _id: "$region",
  totalChildren: { $sum: 1 },
  vaccinatedChildren: {
    $sum: { $cond: [{ $gt: [{ $size: "$vaccinations" }, 0] }, 1, 0] },
  },
},
      },
      {
        $project: {
          region: { $ifNull: ["$_id", "(Sans région)"] },
          retard: { $subtract: ["$totalChildren", "$vaccinatedChildren"] },
          _id: 0,
        },
      },
      { $sort: { retard: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      totalChildren,
      vaccinatedChildren,
      vaccinationsSaisies,
      totalVaccinations,
      coverageRate,
      campaigns,
      monthlyVaccinations,
      coverageByVaccine,
      topRegions,
    });
  } catch (err) {
    console.error("❌ Erreur Dashboard national:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

/* -------------------------------------------------------------------------- */
/* 🟨 DASHBOARD RÉGIONAL ----------------------------------------------------- */
/* -------------------------------------------------------------------------- */
export const getRegionalDashboard = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res.status(401).json({ error: "Utilisateur non authentifié" });

    const userRegion = user.region?.trim() || "";
    const { period, date } = req.query;
    const { startFilter, endFilter } = getDateRange(
      period as string,
      date as string
    );

    let doneDateFilter =
      startFilter && endFilter
        ? { doneDate: { $gte: startFilter, $lte: endFilter } }
        : {} as any;

    // 🛠️ Par défaut (pas de 'period'), filtrer sur l'année en cours
    if (!startFilter && !endFilter) {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      doneDateFilter = { doneDate: { $gte: yearStart, $lte: yearEnd } };
    }

    const totalChildren = await Child.countDocuments({
      region: { $regex: new RegExp(`^${userRegion}$`, "i") },
    });

    const vaccinatedChildrenAgg = await Vaccination.aggregate([
      {
        $lookup: {
          from: "children",
          localField: "child",
          foreignField: "_id",
          as: "childInfo",
        },
      },
      { $unwind: "$childInfo" },
      {
        $match: {
          "childInfo.region": { $regex: new RegExp(`^${userRegion}$`, "i") },
          status: "done",
          ...(doneDateFilter.doneDate ? doneDateFilter : {}),
        },
      },
      { $group: { _id: "$child" } },
    ]);

    const vaccinatedChildren = vaccinatedChildrenAgg.length;

    const vaccinationsSaisies = await Vaccination.aggregate([
      {
        $lookup: {
          from: "children",
          localField: "child",
          foreignField: "_id",
          as: "childInfo",
        },
      },
      { $unwind: "$childInfo" },
      {
        $match: {
          "childInfo.region": { $regex: new RegExp(`^${userRegion}$`, "i") },
          status: "done",
          ...(doneDateFilter.doneDate ? doneDateFilter : {}),
        },
      },
    ]).then((docs) => docs.length);

    const coverageRate =
      totalChildren > 0
        ? Number(((vaccinatedChildren / totalChildren) * 100).toFixed(2))
        : 0;

    let aggregation: any[] = [];

    if (period === "all") {
      aggregation = [
        {
          $lookup: {
            from: "children",
            localField: "child",
            foreignField: "_id",
            as: "childInfo",
          },
        },
        { $unwind: "$childInfo" },
        {
          $match: {
            "childInfo.region": { $regex: new RegExp(`^${userRegion}$`, "i") },
            status: "done",
          },
        },
        { $group: { _id: { $year: "$doneDate" }, value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ];
    } else {
      aggregation = [
        {
          $lookup: {
            from: "children",
            localField: "child",
            foreignField: "_id",
            as: "childInfo",
          },
        },
        { $unwind: "$childInfo" },
        {
          $match: {
            "childInfo.region": { $regex: new RegExp(`^${userRegion}$`, "i") },
            status: "done",
            ...(doneDateFilter.doneDate ? doneDateFilter : {}),
          },
        },
        { $group: { _id: { $month: "$doneDate" }, value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ];
    }

    const monthlyVaccinations = await Vaccination.aggregate(aggregation);

    res.json({
      totalChildren,
      vaccinatedChildren,
      vaccinationsSaisies,
      coverageRate,
      monthlyVaccinations,
    });
  } catch (err) {
    console.error("❌ Erreur Dashboard régional:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

export default {
  getAgentDashboard,
  getNationalDashboard,
  getRegionalDashboard,
};
