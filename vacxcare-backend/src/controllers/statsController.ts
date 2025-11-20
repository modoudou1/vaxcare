import { Request, Response } from "express";
import Campaign from "../models/Campaign";
import Child from "../models/Child";
import Stock from "../models/Stock";
import Vaccination from "../models/Vaccination";
import User from "../models/User";
import HealthCenter from "../models/HealthCenter";
import Appointment from "../models/Appointment";

// ➡️ Nombre total d’enfants vaccinés par vaccin (optionnel: filtrage par vaccin)
export const getVaccinationsStats = async (req: Request, res: Response) => {
  try {
    const { vaccine, region, startDate, endDate } = req.query;

    const match: any = {};
    if (vaccine) match.vaccine = vaccine;
    if (startDate && endDate) {
      match.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    if (region) {
      // On filtre par région via jointure enfant → vaccination
      const stats = await Vaccination.aggregate([
        {
          $lookup: {
            from: "children",
            localField: "child",
            foreignField: "_id",
            as: "childData",
          },
        },
        { $unwind: "$childData" },
        { $match: { "childData.region": region, ...match } },
        { $group: { _id: "$vaccine", total: { $sum: 1 } } },
      ]);
      return res.json({
        message: "Statistiques vaccinations (filtrées)",
        stats,
      });
    }

    const stats = await Vaccination.aggregate([
      { $match: match },
      { $group: { _id: "$vaccine", total: { $sum: 1 } } },
    ]);

    res.json({ message: "Statistiques vaccinations", stats });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

// ➡️ Taux de couverture vaccinale global
export const getCoverageRate = async (req: Request, res: Response) => {
  try {
    const { region } = req.query;
    const filter = region ? { region } : {};

    const totalChildren = await Child.countDocuments(filter);
    const vaccinatedChildren = await Vaccination.distinct("child");

    const rate =
      totalChildren > 0
        ? ((vaccinatedChildren.length / totalChildren) * 100).toFixed(2)
        : "0";

    res.json({
      message: "Taux de couverture vaccinale",
      region: region || "National",
      totalChildren,
      vaccinatedChildren: vaccinatedChildren.length,
      rate: `${rate}%`,
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

// ➡️ Stocks critiques (<50)
export const getCriticalStocks = async (req: Request, res: Response) => {
  try {
    const { vaccine } = req.query;
    const filter: any = { quantity: { $lt: 50 } };
    if (vaccine) filter.vaccine = vaccine;

    const stocks = await Stock.find(filter).populate("vaccine", "name");
    res.json({ message: "Stocks critiques (<50)", stocks });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

// ➡️ Campagnes actives
export const getActiveCampaigns = async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    const campaigns = await Campaign.find({
      startDate: { $lte: today },
      endDate: { $gte: today },
    });
    res.json({ message: "Campagnes actives", campaigns });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

// ➡️ Couverture vaccinale par région
export const getCoverageByRegion = async (_req: Request, res: Response) => {
  try {
    const stats = await Child.aggregate([
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
          region: "$_id",
          totalChildren: 1,
          vaccinatedChildren: 1,
          coverageRate: {
            $cond: [
              { $eq: ["$totalChildren", 0] },
              "0%",
              {
                $concat: [
                  {
                    $toString: {
                      $round: [
                        {
                          $multiply: [
                            {
                              $divide: [
                                "$vaccinatedChildren",
                                "$totalChildren",
                              ],
                            },
                            100,
                          ],
                        },
                        2,
                      ],
                    },
                  },
                  "%",
                ],
              },
            ],
          },
        },
      },
    ]);
    res.json({ message: "Taux de couverture par région", stats });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

// ➡️ Vaccinations par période
export const getVaccinationsByPeriod = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, region, vaccine } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "startDate et endDate sont requis" });
    }

    const match: any = {
      date: {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      },
    };
    if (vaccine) match.vaccine = vaccine;

    if (region) {
      const vaccinations = await Vaccination.aggregate([
        {
          $lookup: {
            from: "children",
            localField: "child",
            foreignField: "_id",
            as: "childData",
          },
        },
        { $unwind: "$childData" },
        { $match: { "childData.region": region, ...match } },
      ]);
      return res.json({
        message: "Vaccinations par période (filtrées)",
        startDate,
        endDate,
        region,
        total: vaccinations.length,
        vaccinations,
      });
    }

    const vaccinations = await Vaccination.find(match);
    res.json({
      message: "Vaccinations par période",
      startDate,
      endDate,
      total: vaccinations.length,
      vaccinations,
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

// ➡️ Stocks par vaccin
export const getStocksByVaccine = async (_req: Request, res: Response) => {
  try {
    const stocks = await Stock.aggregate([
      { $group: { _id: "$vaccine", totalQuantity: { $sum: "$quantity" } } },
    ]);
    res.json({ message: "Stocks par vaccin", stocks });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

// ➡️ Dashboard global
export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const totalChildren = await Child.countDocuments();
    const totalVaccinations = await Vaccination.countDocuments();
    const criticalStocks = await Stock.find({ quantity: { $lt: 50 } });
    const today = new Date();
    const activeCampaigns = await Campaign.find({
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    res.json({
      message: "Dashboard global",
      totalChildren,
      totalVaccinations,
      criticalStocks: criticalStocks.length,
      activeCampaigns: activeCampaigns.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

// ➡️ Stats pour Agent (centre de santé) et District (agrégation)
export const getAgentStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || !user.healthCenter) {
      return res.status(400).json({ error: "Centre de santé non défini" });
    }

    const healthCenterId = user.healthCenter;
    const userId = user._id || user.id;
    const userRole = user.role;

    console.log('\n📊 === getAgentStats ===');
    console.log('User role:', userRole);
    console.log('User healthCenter:', healthCenterId);

    let vaccinationFilter: any = {};
    let stockFilter: any = {};

    // 🔹 Si AGENT → Filtre par givenBy (ses propres vaccinations)
    if (userRole === "agent") {
      vaccinationFilter = { givenBy: userId, status: "done" };
      stockFilter = { healthCenter: healthCenterId };
      console.log('👤 AGENT : Filtrage par givenBy');
    }
    // 🔹 Si DISTRICT → Agrégation de tous les centres du district
    else if (userRole === "district") {
      try {
        // Trouver tous les centres du district
        const centersInDistrict = await HealthCenter.find({
          $or: [
            { name: healthCenterId, type: "district" },
            { districtName: healthCenterId },
          ],
        })
          .select("name")
          .lean();

        const centerNames = centersInDistrict
          .map((c: any) => c.name)
          .filter(Boolean);

        console.log('🏛️ DISTRICT : Centres trouvés:', centerNames.length);
        centerNames.forEach(c => console.log('  -', c));

        if (centerNames.length > 0) {
          vaccinationFilter = {
            status: "done",
            $or: [
              { district: healthCenterId },
              { healthCenter: { $in: centerNames } },
            ],
          };
          stockFilter = { healthCenter: { $in: centerNames } };
        } else {
          vaccinationFilter = { status: "done", district: healthCenterId };
          stockFilter = { healthCenter: healthCenterId };
        }
      } catch (e) {
        console.error('❌ Erreur résolution centres district:', (e as any)?.message);
        vaccinationFilter = { status: "done", district: healthCenterId };
        stockFilter = { healthCenter: healthCenterId };
      }
    }

    // Total vaccinations effectuées
    const totalVaccinations = await Vaccination.countDocuments(vaccinationFilter);

    // Vaccinations ce mois
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = await Vaccination.countDocuments({
      ...vaccinationFilter,
      doneDate: { $gte: startOfMonth },
    });

    // Vaccinations cette semaine
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const thisWeek = await Vaccination.countDocuments({
      ...vaccinationFilter,
      doneDate: { $gte: startOfWeek },
    });

    // État des stocks
    const stockStatus = await Stock.find(stockFilter).lean();

    const formattedStocks = stockStatus.map((s: any) => ({
      vaccine: s.vaccine || "Inconnu",
      quantity: s.quantity,
      status:
        s.quantity < 30 ? "critical" : s.quantity < 50 ? "warning" : "good",
    }));

    // Activité récente (dernières vaccinations effectuées)
    const recentActivity = await Vaccination.find({
      ...vaccinationFilter,
      doneDate: { $exists: true, $ne: null },
    })
      .sort({ doneDate: -1 })
      .limit(5)
      .populate({
        path: "child",
        select: "name",
      })
      .populate({
        path: "vaccine",
        select: "name",
      })
      .lean();

    const formattedActivity = recentActivity.map((v: any) => {
      const childName = v.child?.name;
      const vaccineName = v.vaccine?.name;
      
      return {
        date: v.doneDate,
        child: childName || "Inconnu",
        vaccine: vaccineName || "Inconnu",
      };
    });

    console.log("✅ Agent Stats:", {
      totalVaccinations,
      thisMonth,
      thisWeek,
      stockCount: formattedStocks.length,
      activityCount: formattedActivity.length,
    });

    // Tendance mensuelle (6 derniers mois)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );
      const monthEnd = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0
      );
      const count = await Vaccination.countDocuments({
        ...vaccinationFilter,
        doneDate: { $gte: monthStart, $lte: monthEnd },
      });
      const monthNames = [
        "Janvier",
        "Février",
        "Mars",
        "Avril",
        "Mai",
        "Juin",
        "Juillet",
        "Août",
        "Septembre",
        "Octobre",
        "Novembre",
        "Décembre",
      ];
      monthlyTrend.push({
        month: monthNames[monthStart.getMonth()],
        count,
      });
    }

    res.json({
      totalVaccinations,
      thisMonth,
      thisWeek,
      stockStatus: formattedStocks,
      recentActivity: formattedActivity,
      monthlyTrend,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

// ➡️ Stats pour Agent de district (agrégation par district)
export const getDistrictStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as {
      region?: string;
      healthCenter?: string;
    } | undefined;

    if (!user || !user.healthCenter || !user.region) {
      return res
        .status(400)
        .json({ error: "Centre de santé ou région non défini" });
    }

    // 🔎 Retrouver le centre de santé de l'agent pour déduire le district
    const hc = await HealthCenter.findOne({
      name: user.healthCenter,
      region: user.region,
    }).lean();

    if (!hc) {
      return res.status(404).json({ error: "Centre de santé introuvable" });
    }

    const anyHc: any = hc;
    let districtName: string | undefined;

    if (anyHc.type === "district") {
      districtName = anyHc.name;
    } else if (anyHc.districtName) {
      districtName = anyHc.districtName;
    }

    if (!districtName) {
      return res.status(400).json({
        error:
          "Impossible de déterminer le district à partir de ce centre de santé",
      });
    }

    // 🏥 Récupérer tous les centres appartenant à ce district
    const centersInDistrict = await HealthCenter.find({
      $or: [
        { name: districtName, type: "district" },
        { districtName },
      ],
    })
      .select("name")
      .lean();

    const centerNames = centersInDistrict.map((c: any) => c.name).filter(Boolean);

    // 👶 Enfants du district (rétrocompatible)
    const childFilter: any = { $or: [{ district: districtName }] };
    if (centerNames.length > 0) {
      childFilter.$or.push({ healthCenter: { $in: centerNames } });
    }

    const totalChildren = await Child.countDocuments(childFilter);

    const vaccinationFilterDone: any = { status: "done", $or: [{ district: districtName }] };
    const vaccinationFilterScheduled: any = { status: "scheduled", $or: [{ district: districtName }] };
    const vaccinationFilterMissed: any = { status: "missed", $or: [{ district: districtName }] };
    const vaccinationFilterCancelled: any = { status: "cancelled", $or: [{ district: districtName }] };

    const appointmentFilterPlanned: any = {
      status: { $in: ["planned", "pending", "confirmed"] },
      $or: [{ district: districtName }],
    };
    const appointmentFilterDone: any = { status: "done", $or: [{ district: districtName }] };
    const appointmentFilterMissed: any = { status: "missed", $or: [{ district: districtName }] };
    const appointmentFilterCancelled: any = {
      status: { $in: ["cancelled", "refused"] },
      $or: [{ district: districtName }],
    };

    if (centerNames.length > 0) {
      const centerCond = { healthCenter: { $in: centerNames } };
      vaccinationFilterDone.$or.push(centerCond);
      vaccinationFilterScheduled.$or.push(centerCond);
      vaccinationFilterMissed.$or.push(centerCond);
      vaccinationFilterCancelled.$or.push(centerCond);

      appointmentFilterPlanned.$or.push(centerCond);
      appointmentFilterDone.$or.push(centerCond);
      appointmentFilterMissed.$or.push(centerCond);
      appointmentFilterCancelled.$or.push(centerCond);
    }

    const childrenWithVaccinations = await Vaccination.distinct("child", vaccinationFilterDone);

    const activeChildrenAppointments = await Appointment.distinct(
      "child",
      appointmentFilterPlanned
    );

    // 💉 Vaccinations du district
    const totalVaccinationsDone = await Vaccination.countDocuments(
      vaccinationFilterDone
    );

    const totalVaccinationsScheduled = await Vaccination.countDocuments(
      vaccinationFilterScheduled
    );

    const totalVaccinationsMissed = await Vaccination.countDocuments(
      vaccinationFilterMissed
    );

    const totalVaccinationsCancelled = await Vaccination.countDocuments(
      vaccinationFilterCancelled
    );

    // 🗓️ Rendez-vous du district
    const totalAppointmentsPlanned = await Appointment.countDocuments(
      appointmentFilterPlanned
    );

    const totalAppointmentsDone = await Appointment.countDocuments(
      appointmentFilterDone
    );

    const totalAppointmentsMissed = await Appointment.countDocuments(
      appointmentFilterMissed
    );

    const totalAppointmentsCancelled = await Appointment.countDocuments(
      appointmentFilterCancelled
    );

    return res.json({
      district: districtName,
      region: user.region,
      children: {
        total: totalChildren,
        withAtLeastOneVaccination: childrenWithVaccinations.length,
        withActiveAppointments: activeChildrenAppointments.length,
      },
      vaccinations: {
        done: totalVaccinationsDone,
        scheduled: totalVaccinationsScheduled,
        missed: totalVaccinationsMissed,
        cancelled: totalVaccinationsCancelled,
      },
      appointments: {
        planned: totalAppointmentsPlanned,
        done: totalAppointmentsDone,
        missed: totalAppointmentsMissed,
        cancelled: totalAppointmentsCancelled,
      },
    });
  } catch (err: any) {
    console.error("❌ Erreur getDistrictStats:", err.message || err);
    return res
      .status(500)
      .json({ error: "Erreur serveur", details: err.message || String(err) });
  }
};

// ➡️ Stats pour Régional
export const getRegionalStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || !user.region) {
      return res.status(400).json({ error: "Région non définie" });
    }

    const regionId = user.region;

    // Total DISTRICTS dans la région (pas tous les centres)
    const totalCenters = await HealthCenter.countDocuments({
      region: regionId,
      type: "district", // ✅ Filtrer uniquement les districts
    });

    // Total vaccinations de la région (effectuées uniquement)
    // ✅ Filtrage direct sur le champ region de Vaccination (plus fiable)
    const vaccinationCount = await Vaccination.countDocuments({
      region: regionId,
      status: "done",
    });

    // Taux de couverture
    const totalChildren = await Child.countDocuments({ region: regionId });
    // ✅ Filtrage direct sur region
    const vaccinatedIds = await Vaccination.distinct("child", {
      region: regionId,
      status: "done",
    });
    const vaccinatedCount = vaccinatedIds.length;
    const coverageRate =
      totalChildren > 0
        ? parseFloat(((vaccinatedCount / totalChildren) * 100).toFixed(1))
        : 0;

    // Campagnes actives
    const today = new Date();
    const activeCampaigns = await Campaign.countDocuments({
      region: regionId,
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    // Performance par DISTRICT (agrégation district + acteurs de santé)
    // Trouver tous les districts de la région
    const districts = await HealthCenter.find({ 
      region: regionId,
      type: "district"
    }).lean();
    console.log(`🏛️ Found ${districts.length} districts in region ${regionId}`);

    const centerPerformance = await Promise.all(
      districts.map(async (district: any) => {
        const districtName = district.name;
        
        // Trouver tous les centres du district (district + acteurs)
        const centersInDistrict = await HealthCenter.find({
          $or: [
            { name: districtName, type: "district" },
            { districtName: districtName },
          ],
        })
          .select("name")
          .lean();

        const centerNames = centersInDistrict
          .map((c: any) => c.name)
          .filter(Boolean);

        console.log(`🏛️ District ${districtName}:`, {
          centersFound: centerNames.length,
          centers: centerNames,
        });

        // Vaccinations du district (district + acteurs)
        const vaccinations = await Vaccination.countDocuments({
          status: "done",
          $or: [
            { district: districtName },
            { healthCenter: { $in: centerNames } },
          ],
        });
        console.log(`💉 District ${districtName}: ${vaccinations} vaccinations`);

        // Enfants du district (district + acteurs)
        const childrenInArea = await Child.countDocuments({
          $or: [
            { district: districtName },
            { healthCenter: { $in: centerNames } },
          ],
        });
        
        const vaccinatedInArea = await Vaccination.distinct("child", {
          status: "done",
          $or: [
            { district: districtName },
            { healthCenter: { $in: centerNames } },
          ],
        });

        const coverage =
          childrenInArea > 0
            ? parseFloat(
                ((vaccinatedInArea.length / childrenInArea) * 100).toFixed(1)
              )
            : 0;

        console.log(`📊 District ${districtName} coverage:`, {
          childrenInArea,
          vaccinatedInArea: vaccinatedInArea.length,
          coverage: `${coverage}%`,
        });

        // Stocks du district (agrégation de tous les centres)
        const stocks = await Stock.find({ 
          healthCenter: { $in: centerNames } 
        });
        const criticalStocks = stocks.filter((s) => s.quantity < 30);
        const warningStocks = stocks.filter(
          (s) => s.quantity >= 30 && s.quantity < 50
        );

        const stock =
          criticalStocks.length > 0
            ? "critical"
            : warningStocks.length > 0
            ? "warning"
            : "good";

        console.log(`📦 District ${districtName} stocks:`, {
          total: stocks.length,
          critical: criticalStocks.length,
          warning: warningStocks.length,
          status: stock,
        });

        return {
          name: districtName,
          vaccinations,
          coverage,
          stock,
        };
      })
    );

    // Distribution par vaccin (effectuées uniquement)
    // ✅ Filtrage direct sur region
    const vaccineDistribution = await Vaccination.aggregate([
      { $match: { region: regionId, status: "done" } },
      {
        $lookup: {
          from: "vaccines",
          localField: "vaccine",
          foreignField: "_id",
          as: "vaccineData",
        },
      },
      { $unwind: "$vaccineData" },
      { $group: { _id: "$vaccineData.name", total: { $sum: 1 } } },
    ]);

    const totalVaccinesGiven = vaccineDistribution.reduce(
      (sum, v) => sum + v.total,
      0
    );
    const formattedDistribution = vaccineDistribution.map((v) => ({
      vaccine: v._id,
      total: v.total,
      percentage:
        totalVaccinesGiven > 0
          ? Math.round((v.total / totalVaccinesGiven) * 100)
          : 0,
    }));

    // Tendance mensuelle (vaccinations effectuées)
    // ✅ Filtrage direct sur region
    const now = new Date();
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );
      const monthEnd = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0
      );
      const count = await Vaccination.countDocuments({
        region: regionId,
        status: "done",
        doneDate: { $gte: monthStart, $lte: monthEnd },
      });
      const monthNames = [
        "Janvier",
        "Février",
        "Mars",
        "Avril",
        "Mai",
        "Juin",
        "Juillet",
        "Août",
        "Septembre",
        "Octobre",
        "Novembre",
        "Décembre",
      ];
      monthlyTrend.push({
        month: monthNames[monthStart.getMonth()],
        count,
      });
    }

    // Alertes (uniquement les plus importantes)
    const alerts: { type: string; message: string; severity: string }[] = [];
    const criticalCenters = centerPerformance.filter(
      (c) => c.stock === "critical"
    );
    const lowCoverageCenters = centerPerformance
      .filter((c) => c.coverage < 70)
      .sort((a, b) => a.coverage - b.coverage)
      .slice(0, 2); // Seulement les 2 pires

    // Alertes critiques seulement (stock critique)
    criticalCenters.slice(0, 2).forEach((c) => {
      alerts.push({
        type: "stock",
        message: `Stock critique au ${c.name}`,
        severity: "high",
      });
    });

    // Alertes couverture (seulement si < 70%)
    lowCoverageCenters.forEach((c) => {
      alerts.push({
        type: "coverage",
        message: `Couverture faible: ${c.name} (${c.coverage}%)`,
        severity: "medium",
      });
    });

    console.log("✅ Regional Stats:", {
      totalCenters,
      totalVaccinations: vaccinationCount,
      coverageRate,
      activeCampaigns,
      centersCount: centerPerformance.length,
      alertsCount: alerts.length,
    });

    res.json({
      totalCenters,
      totalVaccinations: vaccinationCount,
      coverageRate,
      activeCampaigns,
      centerPerformance,
      vaccineDistribution: formattedDistribution,
      monthlyTrend,
      alerts,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};
