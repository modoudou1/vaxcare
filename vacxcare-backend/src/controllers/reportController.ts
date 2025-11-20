import { Request, Response } from "express";
import Child from "../models/Child";
import Vaccination from "../models/Vaccination";
import Campaign from "../models/Campaign";
import Stock from "../models/Stock";
import Region from "../models/Region";
import HealthCenter from "../models/HealthCenter";
import User from "../models/User";
import Vaccine from "../models/Vaccine";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export const getNationalReport = async (req: Request, res: Response) => {
  try {
    // Récupérer le filtre de période depuis la query
    const { period = "6months" } = req.query;
    
    // Calculer les dates selon la période
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case "1month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case "3months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case "1year":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case "6months":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
    }

    // 1️⃣ Total enfants et vaccinations (effectuées seulement)
    const totalChildren = await Child.countDocuments();
    const totalVaccinations = await Vaccination.countDocuments({ 
      status: "done",
      doneDate: { $gte: startDate }
    });

    // Total régions et centres
    const totalRegions = await Region.countDocuments({ active: true });
    const totalHealthCenters = await HealthCenter.countDocuments();

    // 2️⃣ Taux de couverture (vaccinations effectuées)
    const vaccinatedChildren = await Vaccination.distinct("child", { status: "done" });
    const coverageRate =
      totalChildren > 0
        ? Number(((vaccinatedChildren.length / totalChildren) * 100).toFixed(1))
        : 0;

    // 3️⃣ Campagnes actives
    const today = new Date();
    const campaigns = await Campaign.countDocuments({
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    // Stocks critiques (< 30)
    const criticalStocks = await Stock.countDocuments({ quantity: { $lt: 30 } });

    // 4️⃣ Évolution mensuelle (adaptée à la période)
    let monthsToShow = 6;
    switch (period) {
      case "1month":
        monthsToShow = 1;
        break;
      case "3months":
        monthsToShow = 3;
        break;
      case "1year":
        monthsToShow = 12;
        break;
      case "6months":
      default:
        monthsToShow = 6;
        break;
    }

    const monthlyVaccinations = [];
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const count = await Vaccination.countDocuments({
        status: "done",
        doneDate: { $gte: monthStart, $lte: monthEnd },
      });
      const monthNames = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
      ];
      monthlyVaccinations.push({
        month: monthNames[monthStart.getMonth()],
        value: count,
      });
    }


    // 5️⃣ Distribution par vaccin (effectuées seulement)
    const vaccineDistribution = await Vaccination.aggregate([
      { $match: { status: "done" } },
      {
        $lookup: {
          from: "vaccines",
          localField: "vaccine",
          foreignField: "_id",
          as: "vaccineInfo",
        },
      },
      { $unwind: "$vaccineInfo" },
      {
        $group: {
          _id: "$vaccineInfo.name",
          total: { $sum: 1 },
        },
      },
    ]);

    const totalVaccinesGiven = vaccineDistribution.reduce((sum, v) => sum + v.total, 0);
    const coverageByVaccine = vaccineDistribution.map((v) => ({
      name: v._id,
      value: v.total,
      percentage: totalVaccinesGiven > 0 ? Math.round((v.total / totalVaccinesGiven) * 100) : 0,
    }));

    // 6️⃣ Performance par région
    const coverageByRegion = await Child.aggregate([
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
            $sum: {
              $cond: [
                {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: "$vaccinations",
                          cond: { $eq: ["$$this.status", "done"] },
                        },
                      },
                    },
                    0,
                  ],
                },
                1,
                0,
              ],
            },
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
              { $gt: ["$totalChildren", 0] },
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$vaccinatedChildren", "$totalChildren"] },
                      100,
                    ],
                  },
                  1,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { coverageRate: -1 } },
    ]);

    // Calculer vaccinations par région
    const vaccinationsByRegion = await Vaccination.aggregate([
      { $match: { status: "done" } },
      {
        $lookup: {
          from: "children",
          localField: "child",
          foreignField: "_id",
          as: "childData",
        },
      },
      { $unwind: "$childData" },
      {
        $group: {
          _id: "$childData.region",
          vaccinations: { $sum: 1 },
        },
      },
    ]);

    // Combiner les données
    const regionPerformance = coverageByRegion.map((r: any) => {
      const vaccData = vaccinationsByRegion.find((v: any) => v._id === r.region);
      return {
        region: r.region || "Non défini",
        totalChildren: r.totalChildren,
        vaccinations: vaccData?.vaccinations || 0,
        coverage: r.coverageRate,
      };
    });

    const top5BestRegions = regionPerformance.slice(0, 5);
    const top5WorstRegions = regionPerformance.slice(-5).reverse();

    console.log("✅ National Report:", {
      totalChildren,
      totalVaccinations,
      totalRegions,
      totalHealthCenters,
      coverageRate: `${coverageRate}%`,
      criticalStocks,
    });

    // ✅ Réponse finale
    res.json({
      summary: {
        totalChildren,
        totalVaccinations,
        totalRegions,
        totalHealthCenters,
        campaigns,
        coverageRate,
        criticalStocks,
      },
      monthlyVaccinations,
      coverageByVaccine,
      regionPerformance,
      top5BestRegions,
      top5WorstRegions,
    });
  } catch (err) {
    console.error("❌ Erreur rapport national:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

// Export PDF du rapport national
export const exportNationalReportPDF = async (req: Request, res: Response) => {
  try {
    // Récupérer les mêmes données que le rapport
    const totalChildren = await Child.countDocuments();
    const totalVaccinations = await Vaccination.countDocuments({ status: "done" });
    const totalRegions = await Region.countDocuments({ active: true });
    const totalHealthCenters = await HealthCenter.countDocuments();
    const vaccinatedChildren = await Vaccination.distinct("child", { status: "done" });
    const coverageRate =
      totalChildren > 0
        ? Number(((vaccinatedChildren.length / totalChildren) * 100).toFixed(1))
        : 0;
    const today = new Date();
    const campaigns = await Campaign.countDocuments({
      startDate: { $lte: today },
      endDate: { $gte: today },
    });
    const criticalStocks = await Stock.countDocuments({ quantity: { $lt: 30 } });

    // Évolution mensuelle
    const now = new Date();
    const monthlyVaccinations = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const count = await Vaccination.countDocuments({
        status: "done",
        doneDate: { $gte: monthStart, $lte: monthEnd },
      });
      const monthNames = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
      ];
      monthlyVaccinations.push({
        month: monthNames[monthStart.getMonth()],
        value: count,
      });
    }

    // Distribution par vaccin
    const vaccineDistribution = await Vaccination.aggregate([
      { $match: { status: "done" } },
      {
        $lookup: {
          from: "vaccines",
          localField: "vaccine",
          foreignField: "_id",
          as: "vaccineInfo",
        },
      },
      { $unwind: "$vaccineInfo" },
      {
        $group: {
          _id: "$vaccineInfo.name",
          total: { $sum: 1 },
        },
      },
    ]);

    const totalVaccinesGiven = vaccineDistribution.reduce((sum, v) => sum + v.total, 0);
    const coverageByVaccine = vaccineDistribution.map((v) => ({
      name: v._id,
      value: v.total,
      percentage: totalVaccinesGiven > 0 ? Math.round((v.total / totalVaccinesGiven) * 100) : 0,
    }));

    // Top régions
    const coverageByRegion = await Child.aggregate([
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
            $sum: {
              $cond: [
                {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: "$vaccinations",
                          cond: { $eq: ["$$this.status", "done"] },
                        },
                      },
                    },
                    0,
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          region: "$_id",
          coverageRate: {
            $cond: [
              { $gt: ["$totalChildren", 0] },
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$vaccinatedChildren", "$totalChildren"] },
                      100,
                    ],
                  },
                  1,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { coverageRate: -1 } },
    ]);

    const top5BestRegions = coverageByRegion.slice(0, 5);
    const top5WorstRegions = coverageByRegion.slice(-5).reverse();

    // Créer le PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const stream = new PassThrough();

    // Headers pour le téléchargement
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=rapport-national-${new Date().toISOString().split("T")[0]}.pdf`
    );

    doc.pipe(stream);
    stream.pipe(res);

    // Couleurs du thème
    const colors = {
      primary: "#10B981", // Green
      secondary: "#3B82F6", // Blue
      danger: "#EF4444", // Red
      warning: "#F59E0B", // Orange
      text: "#1F2937",
      lightGray: "#F3F4F6",
    };

    // En-tête du PDF
    doc
      .fontSize(24)
      .fillColor(colors.primary)
      .text("📊 Rapport National - VacxCare", { align: "center" });

    doc
      .moveDown(0.5)
      .fontSize(12)
      .fillColor(colors.text)
      .text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, { align: "center" });

    doc.moveDown(2);

    // KPIs principaux
    doc.fontSize(16).fillColor(colors.primary).text("Indicateurs Clés", { underline: true });
    doc.moveDown(0.5);

    const kpis = [
      { label: "Enfants enregistrés", value: totalChildren.toLocaleString("fr-FR") },
      { label: "Vaccinations effectuées", value: totalVaccinations.toLocaleString("fr-FR") },
      { label: "Taux de couverture", value: `${coverageRate}%` },
      { label: "Campagnes actives", value: campaigns },
      { label: "Régions actives", value: totalRegions },
      { label: "Centres de santé", value: totalHealthCenters },
      { label: "Stocks critiques", value: criticalStocks },
    ];

    kpis.forEach((kpi, i) => {
      if (i > 0 && i % 2 === 0) doc.moveDown(0.3);
      const xPos = i % 2 === 0 ? 50 : 320;
      doc
        .fontSize(10)
        .fillColor(colors.text)
        .text(`${kpi.label}:`, xPos, doc.y, { continued: true })
        .fillColor(colors.primary)
        .fontSize(14)
        .text(` ${kpi.value}`);
      doc.fontSize(12);
    });

    doc.moveDown(2);

    // Alerte stocks critiques
    if (criticalStocks > 0) {
      doc
        .fontSize(12)
        .fillColor(colors.danger)
        .text(`⚠️ Alerte: ${criticalStocks} stocks critiques détectés`, { align: "center" });
      doc.moveDown(1);
    }

    // Évolution mensuelle
    doc.fontSize(14).fillColor(colors.primary).text("Évolution Mensuelle", { underline: true });
    doc.moveDown(0.5);

    const maxValue = Math.max(...monthlyVaccinations.map((m) => m.value), 1);
    monthlyVaccinations.forEach((item) => {
      const barWidth = (item.value / maxValue) * 400;
      doc
        .fontSize(9)
        .fillColor(colors.text)
        .text(item.month, 50, doc.y, { width: 80, continued: false });
      
      const yPos = doc.y - 12;
      doc
        .rect(140, yPos, barWidth, 10)
        .fillAndStroke(colors.primary, colors.primary);
      
      doc
        .fontSize(8)
        .fillColor("#FFFFFF")
        .text(item.value.toLocaleString("fr-FR"), 145, yPos + 1);
      
      doc.moveDown(0.8);
    });

    doc.moveDown(1);

    // Distribution par vaccin
    if (coverageByVaccine.length > 0) {
      doc.addPage();
      doc.fontSize(14).fillColor(colors.primary).text("Répartition par Vaccin", { underline: true });
      doc.moveDown(0.5);

      coverageByVaccine.forEach((vaccine) => {
        doc
          .fontSize(10)
          .fillColor(colors.text)
          .text(`${vaccine.name}:`, 50, doc.y, { continued: true })
          .text(` ${vaccine.value.toLocaleString("fr-FR")} (${vaccine.percentage}%)`);
        doc.moveDown(0.3);
      });

      doc.moveDown(1);
    }

    // Top 5 meilleures régions
    doc.fontSize(14).fillColor(colors.primary).text("🏆 Top 5 Meilleures Régions", { underline: true });
    doc.moveDown(0.5);

    top5BestRegions.forEach((region: any, i: number) => {
      doc
        .fontSize(10)
        .fillColor(colors.text)
        .text(`${i + 1}. ${region.region}:`, 50, doc.y, { continued: true })
        .fillColor(colors.primary)
        .fontSize(12)
        .text(` ${region.coverageRate}%`);
      doc.fontSize(10);
      doc.moveDown(0.3);
    });

    doc.moveDown(1);

    // Régions nécessitant attention
    doc.fontSize(14).fillColor(colors.danger).text("⚠️ Régions Nécessitant Attention", { underline: true });
    doc.moveDown(0.5);

    top5WorstRegions.forEach((region: any) => {
      doc
        .fontSize(10)
        .fillColor(colors.text)
        .text(`• ${region.region}:`, 50, doc.y, { continued: true })
        .fillColor(colors.danger)
        .fontSize(12)
        .text(` ${region.coverageRate}%`);
      doc.fontSize(10);
      doc.moveDown(0.3);
    });

    // Footer
    doc
      .moveDown(2)
      .fontSize(8)
      .fillColor("#9CA3AF")
      .text(
        `© ${new Date().getFullYear()} VacxCare - Système de Gestion des Vaccinations`,
        { align: "center" }
      );

    doc.end();

    console.log("✅ PDF rapport national généré");
  } catch (err: any) {
    console.error("❌ Erreur génération PDF:", err);
    res.status(500).json({ error: "Erreur génération PDF", details: err.message });
  }
};

// 🆕 STATISTIQUES DÉTAILLÉES PAR RÉGION (avec drill-down vers districts)
export const getRegionDetailedStats = async (req: Request, res: Response) => {
  try {
    const { regionName } = req.params;
    const { period = "6months" } = req.query;

    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case "1month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case "3months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case "1year":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case "6months":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
    }

    // Statistiques globales de la région
    const totalChildrenInRegion = await Child.countDocuments({ region: regionName });
    const vaccinationsInRegion = await Vaccination.countDocuments({
      status: "done",
      doneDate: { $gte: startDate },
    }).populate({ path: "child", match: { region: regionName } });

    // Enfants vaccinés dans la région
    const allVaccinationsInRegion = await Vaccination.find({ status: "done" })
      .populate("child")
      .then((vaccs) => vaccs.filter((v: any) => v.child?.region === regionName));

    const vaccinatedChildrenIds = [...new Set(allVaccinationsInRegion.map((v: any) => v.child?._id.toString()))];
    const coverageRate = totalChildrenInRegion > 0 
      ? Number(((vaccinatedChildrenIds.length / totalChildrenInRegion) * 100).toFixed(1))
      : 0;

    // Récupérer tous les districts (centres de santé) dans cette région
    const healthCenters = await HealthCenter.find({ region: regionName });
    
    // Statistiques par district
    const districtStats = await Promise.all(
      healthCenters.map(async (center) => {
        const childrenInCenter = await Child.countDocuments({ 
          region: regionName, 
          healthCenter: center.name 
        });

        const vaccinationsInCenter = await Vaccination.find({ status: "done" })
          .populate("child")
          .then((vaccs) => 
            vaccs.filter((v: any) => 
              v.child?.region === regionName && v.child?.healthCenter === center.name
            )
          );

        const vaccinatedInCenter = [...new Set(vaccinationsInCenter.map((v: any) => v.child?._id.toString()))];
        const centerCoverage = childrenInCenter > 0 
          ? Number(((vaccinatedInCenter.length / childrenInCenter) * 100).toFixed(1))
          : 0;

        // Agents dans ce district
        const agentsCount = await User.countDocuments({ 
          region: regionName, 
          healthCenter: center.name,
          role: "agent"
        });

        return {
          district: center.name,
          districtType: center.type || "Centre",
          totalChildren: childrenInCenter,
          vaccinations: vaccinationsInCenter.length,
          coverage: centerCoverage,
          agentsCount,
          active: (center as any).active !== false,
        };
      })
    );

    // Vaccinations en retard dans la région
    const overdueVaccinations = await Vaccination.countDocuments({
      status: "scheduled",
      dueDate: { $lt: now },
    }).populate({ path: "child", match: { region: regionName } });

    // Distribution par vaccin dans la région
    const vaccineDistribution = await Vaccination.find({ status: "done" })
      .populate("child")
      .populate("vaccine")
      .then((vaccs) => {
        const filtered = vaccs.filter((v: any) => v.child?.region === regionName);
        const distribution: any = {};
        filtered.forEach((v: any) => {
          const vaccineName = v.vaccine?.name || "Inconnu";
          distribution[vaccineName] = (distribution[vaccineName] || 0) + 1;
        });
        return Object.entries(distribution).map(([name, count]) => ({
          name,
          value: count as number,
        }));
      });

    // Évolution mensuelle dans la région
    const monthlyVaccinations = [];
    const monthsToShow = period === "1year" ? 12 : period === "3months" ? 3 : period === "1month" ? 1 : 6;
    
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const count = await Vaccination.find({
        status: "done",
        doneDate: { $gte: monthStart, $lte: monthEnd },
      })
        .populate("child")
        .then((vaccs) => vaccs.filter((v: any) => v.child?.region === regionName).length);

      const monthNames = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
      ];
      
      monthlyVaccinations.push({
        month: monthNames[monthStart.getMonth()],
        value: count,
      });
    }

    res.json({
      region: regionName,
      summary: {
        totalChildren: totalChildrenInRegion,
        totalVaccinations: allVaccinationsInRegion.length,
        coverageRate,
        totalDistricts: healthCenters.length,
        overdueVaccinations,
      },
      districtStats: districtStats.sort((a, b) => b.coverage - a.coverage),
      vaccineDistribution,
      monthlyVaccinations,
    });

    console.log(`✅ Statistiques détaillées région ${regionName}`);
  } catch (err) {
    console.error("❌ Erreur stats région:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

// 🆕 STATISTIQUES DÉTAILLÉES PAR DISTRICT (avec drill-down vers centres de santé)
export const getDistrictDetailedStats = async (req: Request, res: Response) => {
  try {
    const { regionName, districtName } = req.params;
    const { period = "6months" } = req.query;

    console.log(`📊 Récupération stats district: ${districtName} (${regionName})`);

    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case "1month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case "3months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case "1year":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case "6months":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
    }

    // Trouver tous les centres de santé de ce district
    const healthCenters = await HealthCenter.find({
      region: regionName,
      $or: [
        { districtName: districtName },
        { name: districtName }  // Le district lui-même peut aussi être un health center
      ]
    });

    console.log(`📍 Centres trouvés: ${healthCenters.length}`);

    // Liste des noms de centres pour filtrer
    const centerNames = healthCenters.map(c => c.name);

    // Statistiques globales du district
    const totalChildrenInDistrict = await Child.countDocuments({ 
      region: regionName, 
      healthCenter: { $in: centerNames }
    });

    const vaccinationsInDistrict = await Vaccination.find({ status: "done", doneDate: { $gte: startDate } })
      .populate("child")
      .then((vaccs) => 
        vaccs.filter((v: any) => 
          v.child?.region === regionName && centerNames.includes(v.child?.healthCenter)
        )
      );

    const vaccinatedChildrenIds = [...new Set(vaccinationsInDistrict.map((v: any) => v.child?._id.toString()))];
    const coverageRate = totalChildrenInDistrict > 0 
      ? Number(((vaccinatedChildrenIds.length / totalChildrenInDistrict) * 100).toFixed(1))
      : 0;

    // Nombre total d'agents dans tous les centres du district
    const totalAgents = await User.countDocuments({ 
      region: regionName, 
      healthCenter: { $in: centerNames },
      role: "agent"
    });

    const activeAgents = await User.countDocuments({ 
      region: regionName, 
      healthCenter: { $in: centerNames },
      role: "agent",
      active: true
    });

    // Statistiques par centre de santé
    const healthCenterStats = await Promise.all(
      healthCenters.map(async (center) => {
        const childrenInCenter = await Child.countDocuments({ 
          region: regionName, 
          healthCenter: center.name 
        });

        const vaccinationsInCenter = await Vaccination.find({ 
          status: "done",
          doneDate: { $gte: startDate }
        })
          .populate("child")
          .then((vaccs) => 
            vaccs.filter((v: any) => 
              v.child?.region === regionName && v.child?.healthCenter === center.name
            )
          );

        const vaccinatedInCenter = [...new Set(vaccinationsInCenter.map((v: any) => v.child?._id.toString()))];
        const centerCoverage = childrenInCenter > 0 
          ? Number(((vaccinatedInCenter.length / childrenInCenter) * 100).toFixed(1))
          : 0;

        const agentsCount = await User.countDocuments({ 
          region: regionName, 
          healthCenter: center.name,
          role: "agent"
        });

        const activeAgentsCount = await User.countDocuments({ 
          region: regionName, 
          healthCenter: center.name,
          role: "agent",
          active: true
        });

        return {
          healthCenterId: (center._id as any).toString(),
          healthCenterName: center.name,
          healthCenterType: center.type || "Centre de Santé",
          totalChildren: childrenInCenter,
          vaccinations: vaccinationsInCenter.length,
          coverage: centerCoverage,
          agentsCount,
          activeAgentsCount,
          active: (center as any).active !== false,
        };
      })
    );

    // Vaccinations en retard dans le district
    const overdueVaccinations = await Vaccination.find({
      status: "scheduled",
      dueDate: { $lt: now },
    })
      .populate("child")
      .then((vaccs) =>
        vaccs.filter((v: any) =>
          v.child?.region === regionName && centerNames.includes(v.child?.healthCenter)
        ).length
      );

    // Distribution par vaccin dans le district
    const vaccineDistribution = await Vaccination.find({ status: "done", doneDate: { $gte: startDate } })
      .populate("child")
      .populate("vaccine")
      .then((vaccs) => {
        const filtered = vaccs.filter((v: any) => 
          v.child?.region === regionName && centerNames.includes(v.child?.healthCenter)
        );
        const distribution: any = {};
        filtered.forEach((v: any) => {
          const vaccineName = v.vaccine?.name || "Inconnu";
          distribution[vaccineName] = (distribution[vaccineName] || 0) + 1;
        });
        return Object.entries(distribution).map(([name, count]) => ({
          name,
          value: count as number,
        }));
      });

    // Évolution mensuelle du district
    const monthlyVaccinations = [];
    const monthsToShow = period === "1year" ? 12 : period === "3months" ? 3 : period === "1month" ? 1 : 6;
    const monthNames = [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
    ];
    
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const count = await Vaccination.find({
        status: "done",
        doneDate: { $gte: monthStart, $lte: monthEnd },
      })
        .populate("child")
        .then((vaccs) => 
          vaccs.filter((v: any) => 
            v.child?.region === regionName && centerNames.includes(v.child?.healthCenter)
          ).length
        );
      
      monthlyVaccinations.push({
        month: monthNames[monthStart.getMonth()],
        value: count,
      });
    }

    res.json({
      region: regionName,
      district: districtName,
      summary: {
        totalChildren: totalChildrenInDistrict,
        totalVaccinations: vaccinationsInDistrict.length,
        coverageRate,
        totalHealthCenters: healthCenters.length,
        activeHealthCenters: healthCenters.filter((c) => (c as any).active !== false).length,
        totalAgents,
        activeAgents,
        overdueVaccinations,
      },
      healthCenterStats: healthCenterStats.sort((a, b) => b.vaccinations - a.vaccinations),
      monthlyVaccinations,
      vaccineDistribution,
    });

    console.log(`✅ Statistiques district calculées: ${healthCenters.length} centres`);
  } catch (err) {
    console.error("❌ Erreur stats district:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

// 🆕 STATISTIQUES COMPLÈTES PAR VACCIN
export const getVaccineDetailedStats = async (req: Request, res: Response) => {
  try {
    const { period = "6months" } = req.query;

    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case "1month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case "3months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case "1year":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case "6months":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
    }

    // Tous les vaccins
    const vaccines = await Vaccine.find();

    // Statistiques par vaccin
    const vaccineStats = await Promise.all(
      vaccines.map(async (vaccine) => {
        const totalDoses = await Vaccination.countDocuments({
          vaccine: vaccine._id,
          status: "done",
          doneDate: { $gte: startDate },
        });

        const scheduledDoses = await Vaccination.countDocuments({
          vaccine: vaccine._id,
          status: "scheduled",
        });

        const overdueDoses = await Vaccination.countDocuments({
          vaccine: vaccine._id,
          status: "scheduled",
          dueDate: { $lt: now },
        });

        const missedDoses = await Vaccination.countDocuments({
          vaccine: vaccine._id,
          status: "missed",
          updatedAt: { $gte: startDate },
        });

        // Stock disponible pour ce vaccin
        const totalStock = await Stock.aggregate([
          { $match: { vaccine: vaccine.name.toUpperCase() } },
          { $group: { _id: null, total: { $sum: "$quantity" } } },
        ]);

        const stockQuantity = totalStock.length > 0 ? totalStock[0].total : 0;

        // Distribution par région
        const regionDistribution = await Vaccination.find({
          vaccine: vaccine._id,
          status: "done",
        })
          .populate("child")
          .then((vaccs) => {
            const distribution: any = {};
            vaccs.forEach((v: any) => {
              const region = v.child?.region || "Non défini";
              distribution[region] = (distribution[region] || 0) + 1;
            });
            return Object.entries(distribution).map(([region, count]) => ({
              region,
              count: count as number,
            }));
          });

        // Évolution mensuelle pour ce vaccin
        const monthlyData = [];
        const monthsToShow = period === "1year" ? 12 : period === "3months" ? 3 : period === "1month" ? 1 : 6;
        
        for (let i = monthsToShow - 1; i >= 0; i--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
          
          const count = await Vaccination.countDocuments({
            vaccine: vaccine._id,
            status: "done",
            doneDate: { $gte: monthStart, $lte: monthEnd },
          });

          const monthNames = [
            "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
            "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
          ];
          
          monthlyData.push({
            month: monthNames[monthStart.getMonth()],
            value: count,
          });
        }

        return {
          vaccineName: vaccine.name,
          vaccineDescription: vaccine.description,
          ageInMonths: (vaccine as any).ageInMonths,
          totalDoses,
          scheduledDoses,
          overdueDoses,
          missedDoses,
          stockQuantity,
          completionRate: totalDoses + scheduledDoses > 0
            ? Number(((totalDoses / (totalDoses + scheduledDoses)) * 100).toFixed(1))
            : 0,
          regionDistribution: regionDistribution.sort((a, b) => b.count - a.count),
          monthlyData,
        };
      })
    );

    res.json({
      vaccineStats: vaccineStats.sort((a, b) => b.totalDoses - a.totalDoses),
    });

    console.log("✅ Statistiques détaillées par vaccin");
  } catch (err) {
    console.error("❌ Erreur stats vaccins:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

// 🆕 INDICATEURS DE PERFORMANCE AVANCÉS
export const getPerformanceIndicators = async (req: Request, res: Response) => {
  try {
    const { period = "6months" } = req.query;

    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case "1month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case "3months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case "1year":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case "6months":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
    }

    // KPIs généraux
    const totalVaccinations = await Vaccination.countDocuments({
      status: "done",
      doneDate: { $gte: startDate },
    });

    const scheduledVaccinations = await Vaccination.countDocuments({
      status: "scheduled",
    });

    const overdueVaccinations = await Vaccination.countDocuments({
      status: "scheduled",
      dueDate: { $lt: now },
    });

    const missedVaccinations = await Vaccination.countDocuments({
      status: "missed",
      updatedAt: { $gte: startDate },
    });

    const cancelledVaccinations = await Vaccination.countDocuments({
      status: "cancelled",
      updatedAt: { $gte: startDate },
    });

    // Taux de complétion
    const completionRate = totalVaccinations + scheduledVaccinations > 0
      ? Number(((totalVaccinations / (totalVaccinations + scheduledVaccinations)) * 100).toFixed(1))
      : 0;

    // Taux de rendez-vous honorés
    const appointmentSuccessRate = totalVaccinations + missedVaccinations > 0
      ? Number(((totalVaccinations / (totalVaccinations + missedVaccinations)) * 100).toFixed(1))
      : 0;

    // Délai moyen de vaccination (différence entre date due et date faite)
    const vaccinationsWithDelay = await Vaccination.find({
      status: "done",
      doneDate: { $gte: startDate },
      dueDate: { $exists: true },
    }).select("dueDate doneDate");

    let totalDelayDays = 0;
    let onTimeCount = 0;
    let lateCount = 0;

    vaccinationsWithDelay.forEach((v: any) => {
      if (v.dueDate && v.doneDate) {
        const delayDays = Math.floor((v.doneDate.getTime() - v.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        totalDelayDays += Math.abs(delayDays);
        if (delayDays <= 0) {
          onTimeCount++;
        } else {
          lateCount++;
        }
      }
    });

    const averageDelayDays = vaccinationsWithDelay.length > 0
      ? Number((totalDelayDays / vaccinationsWithDelay.length).toFixed(1))
      : 0;

    const onTimeRate = vaccinationsWithDelay.length > 0
      ? Number(((onTimeCount / vaccinationsWithDelay.length) * 100).toFixed(1))
      : 0;

    // Distribution par tranches d'âge
    const children = await Child.find();
    const ageDistribution = {
      "0-6 mois": 0,
      "6-12 mois": 0,
      "1-2 ans": 0,
      "2-5 ans": 0,
      "5+ ans": 0,
    };

    children.forEach((child: any) => {
      if (child.dateOfBirth) {
        const ageInMonths = Math.floor((now.getTime() - child.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 30));
        if (ageInMonths < 6) ageDistribution["0-6 mois"]++;
        else if (ageInMonths < 12) ageDistribution["6-12 mois"]++;
        else if (ageInMonths < 24) ageDistribution["1-2 ans"]++;
        else if (ageInMonths < 60) ageDistribution["2-5 ans"]++;
        else ageDistribution["5+ ans"]++;
      }
    });

    // Top 5 agents les plus performants
    const topAgents = await Vaccination.aggregate([
      { $match: { status: "done", doneDate: { $gte: startDate } } },
      {
        $group: {
          _id: "$administeredBy",
          vaccinations: { $sum: 1 },
        },
      },
      { $sort: { vaccinations: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "agentInfo",
        },
      },
      { $unwind: "$agentInfo" },
      {
        $project: {
          agentName: {
            $concat: [
              { $ifNull: ["$agentInfo.firstName", ""] },
              " ",
              { $ifNull: ["$agentInfo.lastName", ""] },
            ],
          },
          agentEmail: "$agentInfo.email",
          region: "$agentInfo.region",
          healthCenter: "$agentInfo.healthCenter",
          vaccinations: 1,
        },
      },
    ]);

    // Alertes critiques
    const criticalAlerts = {
      stocksLow: await Stock.countDocuments({ quantity: { $lt: 30 } }),
      stocksOut: await Stock.countDocuments({ quantity: 0 }),
      overdueVaccinations,
      inactiveAgents: await User.countDocuments({ role: "agent", active: false }),
    };

    res.json({
      kpis: {
        totalVaccinations,
        scheduledVaccinations,
        overdueVaccinations,
        missedVaccinations,
        cancelledVaccinations,
        completionRate,
        appointmentSuccessRate,
        averageDelayDays,
        onTimeRate,
        onTimeCount,
        lateCount,
      },
      ageDistribution,
      topAgents,
      criticalAlerts,
    });

    console.log("✅ Indicateurs de performance calculés");
  } catch (err) {
    console.error("❌ Erreur indicateurs performance:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

// Statistiques détaillées d'un centre de santé
export const getHealthCenterDetailedStats = async (req: Request, res: Response) => {
  try {
    const { regionName, districtName, healthCenterName } = req.params;
    const { period = "6months" } = req.query as { period?: string };

    console.log(`📊 Récupération stats centre de santé: ${healthCenterName} (${districtName}, ${regionName})`);

    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case "1month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case "3months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case "1year":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case "6months":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
    }

    // Trouver le centre de santé
    const healthCenter = await HealthCenter.findOne({ 
      name: healthCenterName,
      region: regionName 
    });

    if (!healthCenter) {
      return res.status(404).json({ error: "Centre de santé non trouvé" });
    }

    // Enfants enregistrés dans ce centre
    const totalChildren = await Child.countDocuments({ 
      region: regionName,
      healthCenter: healthCenterName 
    });

    // Vaccinations effectuées dans ce centre
    const completedVaccinations = await Vaccination.find({ 
      status: "done",
      doneDate: { $gte: startDate }
    }).populate("child");

    const centerVaccinations = completedVaccinations.filter(
      (v: any) => v.child?.region === regionName && v.child?.healthCenter === healthCenterName
    );

    // Enfants vaccinés (unique)
    const vaccinatedChildren = [...new Set(centerVaccinations.map((v: any) => v.child?._id.toString()))];
    const coverageRate = totalChildren > 0 
      ? Number(((vaccinatedChildren.length / totalChildren) * 100).toFixed(1))
      : 0;

    // Vaccinations en retard
    const overdueVaccinations = await Vaccination.find({
      status: "scheduled",
      dueDate: { $lt: now },
    })
      .populate("child")
      .then((vaccs) => 
        vaccs.filter((v: any) => 
          v.child?.region === regionName && v.child?.healthCenter === healthCenterName
        ).length
      );

    // Agents de ce centre
    const agents = await User.find({ 
      region: regionName,
      healthCenter: healthCenterName,
      role: "agent"
    });

    const activeAgents = agents.filter(a => a.active !== false).length;

    // Statistiques par agent
    const agentStats = await Promise.all(
      agents.map(async (agent) => {
        const agentVaccinations = await Vaccination.countDocuments({
          vaccinatedBy: agent._id,
          status: "done",
          doneDate: { $gte: startDate },
        });

        const agentChildren = await Vaccination.find({
          vaccinatedBy: agent._id,
          status: "done",
        })
          .populate("child")
          .then((vaccs) => [...new Set(vaccs.map((v: any) => v.child?._id.toString()))].length);

        const completedAppts = await Vaccination.countDocuments({
          vaccinatedBy: agent._id,
          status: "done",
        });

        const missedAppts = await Vaccination.countDocuments({
          vaccinatedBy: agent._id,
          status: "missed",
        });

        const cancelledAppts = await Vaccination.countDocuments({
          vaccinatedBy: agent._id,
          status: "cancelled",
        });

        const totalAppts = completedAppts + missedAppts + cancelledAppts;
        const successRate = totalAppts > 0 ? Number(((completedAppts / totalAppts) * 100).toFixed(1)) : 0;

        return {
          agentId: agent._id.toString(),
          agentName: `${agent.firstName} ${agent.lastName}`,
          agentEmail: agent.email,
          agentPhone: agent.phone,
          agentLevel: agent.agentLevel,
          active: agent.active !== false,
          vaccinations: agentVaccinations,
          childrenVaccinated: agentChildren,
          completedAppointments: completedAppts,
          missedAppointments: missedAppts,
          cancelledAppointments: cancelledAppts,
          successRate,
        };
      })
    );

    // Évolution mensuelle
    const monthlyVaccinations = [];
    const monthsToShow = period === "1year" ? 12 : period === "3months" ? 3 : period === "1month" ? 1 : 6;
    const monthNames = [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
    ];

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const count = await Vaccination.find({
        status: "done",
        doneDate: { $gte: monthStart, $lte: monthEnd },
      })
        .populate("child")
        .then((vaccs) => 
          vaccs.filter((v: any) => 
            v.child?.region === regionName && v.child?.healthCenter === healthCenterName
          ).length
        );
      
      monthlyVaccinations.push({
        month: monthNames[monthStart.getMonth()],
        value: count,
      });
    }

    // Distribution par vaccin
    const vaccines = await Vaccine.find();
    const vaccineDistribution = await Promise.all(
      vaccines.map(async (vaccine) => {
        const count = await Vaccination.find({
          vaccine: vaccine._id,
          status: "done",
        })
          .populate("child")
          .then((vaccs) => 
            vaccs.filter((v: any) => 
              v.child?.region === regionName && v.child?.healthCenter === healthCenterName
            ).length
          );

        return {
          name: vaccine.name,
          value: count,
        };
      })
    );

    res.json({
      region: regionName,
      district: districtName,
      healthCenter: healthCenterName,
      healthCenterType: healthCenter.type || "Centre de Santé",
      summary: {
        totalChildren,
        totalVaccinations: centerVaccinations.length,
        coverageRate,
        totalAgents: agents.length,
        activeAgents,
        overdueVaccinations,
      },
      agentStats,
      monthlyVaccinations,
      vaccineDistribution: vaccineDistribution.filter(v => v.value > 0),
    });

    console.log("✅ Statistiques centre de santé calculées");
  } catch (err) {
    console.error("❌ Erreur stats centre de santé:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};