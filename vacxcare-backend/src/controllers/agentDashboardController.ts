import { Request, Response } from "express";
import Appointment from "../models/Appointment";
import Campaign from "../models/Campaign";
import Child from "../models/Child";
import Notification from "../models/Notification";
import Stock from "../models/Stock";
import Vaccination from "../models/Vaccination";
import HealthCenter from "../models/HealthCenter";
import { calculateAgentCompletionRate } from "../utils/completionRate";

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

    // 🧭 Déterminer si l’agent est un compte District (centre de type "district")
    // et récupérer la liste des centres rattachés à son district
    let districtName: string | undefined;
    let centerNamesInDistrict: string[] = [];
    try {
      if (healthCenter && user.region) {
        const hc = await HealthCenter.findOne({
          name: healthCenter,
          region: user.region,
        }).lean();

        if (hc) {
          const anyHc: any = hc;
          if (anyHc.type === "district") {
            districtName = anyHc.name;
          } else if (anyHc.districtName) {
            districtName = anyHc.districtName;
          }

          if (districtName) {
            const centersInDistrict = await HealthCenter.find({
              $or: [
                { name: districtName, type: "district" },
                { districtName },
              ],
            })
              .select("name")
              .lean();
            centerNamesInDistrict = centersInDistrict
              .map((c: any) => c.name)
              .filter(Boolean);
          }
        }
      }
    } catch (e) {
      console.error(
        "❌ Erreur résolution district pour Dashboard agent:",
        (e as any)?.message
      );
    }

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
    let childFilter: any;
    if (districtName && centerNamesInDistrict.length > 0) {
      childFilter = {
        $or: [
          { district: districtName },
          { healthCenter: { $in: centerNamesInDistrict } },
        ],
      };
    } else {
      childFilter = {
        healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
      };
    }

    const totalChildren = await Child.countDocuments(childFilter);

    /* 📅 Rendez-vous du jour */
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let appointmentsTodayFilter: any = {
      date: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ["planned", "pending", "confirmed"] },
    };
    if (districtName && centerNamesInDistrict.length > 0) {
      appointmentsTodayFilter.$or = [
        { district: districtName },
        { healthCenter: { $in: centerNamesInDistrict } },
      ];
    } else {
      appointmentsTodayFilter.healthCenter = {
        $regex: new RegExp(`^${healthCenter}$`, "i"),
      };
    }

    const appointmentsToday = await Appointment.countDocuments(
      appointmentsTodayFilter
    );

    /* 🗓️ Rendez-vous prévus */
    let totalAppointmentsPlannedFilter: any = {
      status: { $in: ["planned", "pending", "confirmed"] },
      ...dateFilter,
    };
    if (districtName && centerNamesInDistrict.length > 0) {
      totalAppointmentsPlannedFilter.$or = [
        { district: districtName },
        { healthCenter: { $in: centerNamesInDistrict } },
      ];
    } else {
      totalAppointmentsPlannedFilter.healthCenter = {
        $regex: new RegExp(`^${healthCenter}$`, "i"),
      };
    }

    const totalAppointmentsPlanned = await Appointment.countDocuments(
      totalAppointmentsPlannedFilter
    );

    /* 💉 Vaccinations saisies */
    let vaccinationsSaisiesFilter: any = {
      status: "done",
      ...doneDateFilter,
    };
    if (districtName && centerNamesInDistrict.length > 0) {
      vaccinationsSaisiesFilter.$or = [
        { district: districtName },
        { healthCenter: { $in: centerNamesInDistrict } },
      ];
    } else {
      vaccinationsSaisiesFilter.healthCenter = {
        $regex: new RegExp(`^${healthCenter}$`, "i"),
      };
    }

    const vaccinationsSaisies = await Vaccination.countDocuments(
      vaccinationsSaisiesFilter
    );

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
    const stockFilter: any = {
      quantity: { $lt: 10 },
    };
    if (districtName && centerNamesInDistrict.length > 0) {
      stockFilter.healthCenter = { $in: centerNamesInDistrict };
    } else {
      stockFilter.healthCenter = {
        $regex: new RegExp(`^${healthCenter}$`, "i"),
      };
    }

    const lowStocks = await Stock.find(stockFilter).select("vaccine quantity");

    const lowStocksFormatted = lowStocks.map((s) => ({
      vaccine: s.vaccine,
      remaining: s.quantity,
    }));

    /* ⏰ Lots expirant */
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const expiringStockFilter: any = {
      expirationDate: { $lte: soon },
    };
    if (districtName && centerNamesInDistrict.length > 0) {
      expiringStockFilter.healthCenter = { $in: centerNamesInDistrict };
    } else {
      expiringStockFilter.healthCenter = {
        $regex: new RegExp(`^${healthCenter}$`, "i"),
      };
    }

    const expiringLots = await Stock.find(expiringStockFilter).select(
      "vaccine batchNumber expirationDate"
    );

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
    const matchFilter: any = {
      status: "done",
      ...(doneDateFilter.doneDate ? doneDateFilter : {}),
    };
    if (districtName && centerNamesInDistrict.length > 0) {
      matchFilter.$or = [
        { district: districtName },
        { healthCenter: { $in: centerNamesInDistrict } },
      ];
    } else {
      matchFilter.healthCenter = {
        $regex: new RegExp(`^${healthCenter}$`, "i"),
      };
    }

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

    let aggregation: any[] = [];

    if (period === "all") {
      aggregation = [
        { $match: { status: "done" } },
        { $group: { _id: { $year: "$doneDate" }, value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ];
    } else {
      aggregation = [
        { $match: { status: "done", ...doneDateFilter } },
        { $group: { _id: { $month: "$doneDate" }, value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ];
    }

    const monthlyVaccinations = await Vaccination.aggregate(aggregation);

    res.json({
      totalChildren,
      vaccinatedChildren,
      vaccinationsSaisies,
      totalVaccinations,
      coverageRate,
      campaigns,
      monthlyVaccinations,
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

    const doneDateFilter =
      startFilter && endFilter
        ? { doneDate: { $gte: startFilter, $lte: endFilter } }
        : {};

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

/* -------------------------------------------------------------------------- */
/* 🆕 NOUVEAU DASHBOARD AGENT (Modern UI) ------------------------------------ */
/* -------------------------------------------------------------------------- */
export const getAgentStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res.status(401).json({ error: "Utilisateur non authentifié" });

    const healthCenter =
      typeof user.healthCenter === "string"
        ? user.healthCenter.trim()
        : (user.healthCenter?.name ?? "").trim();

    /* 👶 Total enfants suivis */
    const totalChildren = await Child.countDocuments({
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
    });

    /* 💉 Enfants vaccinés (au moins une vaccination faite) */
    const vaccinatedChildrenIds = await Vaccination.distinct("child", {
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
      status: "done",
    });
    const vaccinatedChildren = vaccinatedChildrenIds.length;

    /* ⏳ Vaccinations en attente (planned ou scheduled) */
    const pendingVaccinations = await Vaccination.countDocuments({
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
      status: { $in: ["planned", "scheduled"] },
    });

    /* ⚠️ Vaccinations ratées/manquées (status = missed) */
    const now = new Date();
    const overdueVaccinations = await Vaccination.countDocuments({
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
      status: "missed",
    });

    /* 📅 Rendez-vous à venir (Appointments + Vaccinations programmées) */
    const upcomingAppointmentsCount = await Appointment.countDocuments({
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
      status: { $in: ["planned", "pending", "confirmed"] },
      date: { $gte: now },
    });
    
    const upcomingVaccinationsCount = await Vaccination.countDocuments({
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
      status: { $in: ["planned", "scheduled"] },
      scheduledDate: { $gte: now },
    });
    
    const upcomingAppointments = upcomingAppointmentsCount + upcomingVaccinationsCount;

    /* 📊 Taux de complétion (basé sur le calendrier vaccinal) */
    const completionRateData = await calculateAgentCompletionRate(healthCenter);
    const completionRate = completionRateData.completionRate;

    /* 📜 Activité récente (dernières vaccinations et enregistrements) */
    const recentVaccinations = await Vaccination.find({
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
      status: "done",
    })
      .sort({ doneDate: -1 })
      .limit(5)
      .populate("child", "firstName lastName")
      .populate("vaccine", "name")
      .select("child vaccine doneDate");

    const recentChildren = await Child.find({
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select("firstName lastName createdAt");

    const recentActivity = [
      ...recentVaccinations.map((v: any) => ({
        type: "vaccination",
        child: v.child
          ? `${v.child.firstName} ${v.child.lastName}`
          : "Inconnu",
        date: v.doneDate?.toISOString() || new Date().toISOString(),
        vaccine: v.vaccine?.name || "Vaccin inconnu",
      })),
      ...recentChildren.map((c: any) => ({
        type: "registration",
        child: `${c.firstName} ${c.lastName}`,
        date: c.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    res.json({
      totalChildren,
      vaccinatedChildren,
      pendingVaccinations,
      overdueVaccinations,
      upcomingAppointments,
      completionRate,
      recentActivity,
    });
  } catch (err) {
    console.error("❌ Erreur Stats agent:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

/* -------------------------------------------------------------------------- */
/* 📅 CALENDRIER AGENT - Récupérer tous les rendez-vous + vaccinations programmées */
/* -------------------------------------------------------------------------- */
export const getAgentCalendar = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res.status(401).json({ error: "Utilisateur non authentifié" });

    const healthCenter =
      typeof user.healthCenter === "string"
        ? user.healthCenter.trim()
        : (user.healthCenter?.name ?? "").trim();

    const { month, year } = req.query;
    
    // Construire le filtre de date si mois/année fournis
    let dateFilter: any = {};
    let scheduledFilter: any = {};
    if (month && year) {
      const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
      const endDate = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59, 999);
      dateFilter = { date: { $gte: startDate, $lte: endDate } };
      scheduledFilter = { scheduledDate: { $gte: startDate, $lte: endDate } };
    }

    // Récupérer les rendez-vous (Appointments)
    const appointments = await Appointment.find({
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
      ...dateFilter,
    })
      .populate("child", "firstName lastName")
      .populate("vaccine", "name")
      .sort({ date: 1 })
      .select("date status child vaccine notes doseNumber");

    // Récupérer les vaccinations avec scheduledDate (tous status)
    const scheduledVaccinations = await Vaccination.find({
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
      scheduledDate: { $ne: null },
      ...scheduledFilter,
    })
      .populate("child", "firstName lastName")
      .populate("vaccine", "name")
      .sort({ scheduledDate: 1 })
      .select("scheduledDate status child vaccine notes doseNumber");

    // Formater les rendez-vous
    const formattedAppointments = appointments.map((apt: any) => ({
      id: apt._id,
      type: "appointment",
      title: apt.child
        ? `${apt.child.firstName} ${apt.child.lastName}`
        : "Enfant inconnu",
      date: apt.date,
      status: apt.status,
      vaccine: apt.vaccine?.name || "Non spécifié",
      doseNumber: apt.doseNumber,
      notes: apt.notes,
      childId: apt.child?._id,
    }));

    // Formater les vaccinations programmées
    const formattedVaccinations = scheduledVaccinations.map((vacc: any) => ({
      id: vacc._id,
      type: "vaccination",
      title: vacc.child
        ? `${vacc.child.firstName} ${vacc.child.lastName}`
        : "Enfant inconnu",
      date: vacc.scheduledDate,
      status: vacc.status,
      vaccine: vacc.vaccine?.name || "Non spécifié",
      doseNumber: vacc.doseNumber,
      notes: vacc.notes,
      childId: vacc.child?._id,
    }));

    // Combiner et trier par date
    const allEvents = [...formattedAppointments, ...formattedVaccinations].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json({
      success: true,
      appointments: allEvents,
      stats: {
        totalAppointments: formattedAppointments.length,
        totalVaccinations: formattedVaccinations.length,
        total: allEvents.length,
      },
    });
  } catch (err) {
    console.error("❌ Erreur Calendrier agent:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

export default {
  getAgentDashboard,
  getNationalDashboard,
  getRegionalDashboard,
  getAgentStats,
  getAgentCalendar,
};
