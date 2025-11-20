import { Request, Response } from "express";
import Campaign from "../models/Campaign";
import Child from "../models/Child";
import Vaccination from "../models/Vaccination";

export const getRegionalDashboard = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userRegion = user.region;

    if (!userRegion) {
      return res.status(400).json({
        success: false,
        message: "Région de l'utilisateur non définie",
      });
    }

    // 1️⃣ Nombre total d'enfants dans la région
    const totalChildren = await Child.countDocuments({ region: userRegion });

    // 2️⃣ Nombre d'enfants vaccinés dans la région (au moins une vaccination)
    // ✅ Filtrage direct sur le champ region de Vaccination (plus fiable)
    const vaccinatedChildren = await Vaccination.distinct("child", {
      region: userRegion,
      status: "done",
    }).then((ids) => ids.length);

    // 3️⃣ Taux de couverture régionale (%)
    const coverageRate =
      totalChildren > 0
        ? Number(((vaccinatedChildren / totalChildren) * 100).toFixed(2))
        : 0;

    // 4️⃣ Campagnes actives dans la région
    const today = new Date();
    const activeCampaigns = await Campaign.countDocuments({
      startDate: { $lte: today },
      endDate: { $gte: today },
      $or: [{ region: "Toutes" }, { region: userRegion }],
    });

    // 5️⃣ Évolution mensuelle (région) - Utiliser createdAt au lieu de date
    // ✅ Filtrage direct sur region
    const monthlyVaccinations = await Vaccination.aggregate([
      { $match: { region: userRegion } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          value: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          month: {
            $arrayElemAt: [
              [
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
              ],
              { $subtract: ["$_id", 1] },
            ],
          },
          value: 1,
        },
      },
    ]);

    // 6️⃣ Répartition par vaccin (région)
    // ✅ Filtrage direct sur region
    const coverageByVaccine = await Vaccination.aggregate([
      { $match: { region: userRegion } },
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

    // 7️⃣ Top 5 agents avec le plus de vaccinations en retard
    // ✅ Filtrage direct sur region
    const topAgents = await Vaccination.aggregate([
      { $match: { region: userRegion } },
      {
        $lookup: {
          from: "users",
          localField: "givenBy",
          foreignField: "_id",
          as: "agentInfo",
        },
      },
      { $unwind: { path: "$agentInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$givenBy",
          agentName: { 
            $first: { 
              $concat: [
                { $ifNull: ["$agentInfo.firstName", ""] },
                " ",
                { $ifNull: ["$agentInfo.lastName", ""] }
              ]
            }
          },
          totalVaccinations: { $sum: 1 },
          lateVaccinations: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "scheduled"] },
                    { $lt: ["$scheduledDate", today] }
                  ]
                },
                1,
                0
              ]
            }
          },
          missedVaccinations: {
            $sum: { $cond: [{ $eq: ["$status", "missed"] }, 1, 0] }
          }
        },
      },
      {
        $project: {
          name: { 
            $cond: [
              { $eq: ["$agentName", " "] },
              "(Agent inconnu)",
              "$agentName"
            ]
          },
          retard: { $add: ["$lateVaccinations", "$missedVaccinations"] },
          totalVaccinations: 1
        },
      },
      { $sort: { retard: -1, totalVaccinations: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      totalChildren,
      vaccinatedChildren,
      coverageRate,
      activeCampaigns,
      monthlyVaccinations,
      topAgents,
      coverageByVaccine,
      region: userRegion,
    });
  } catch (err) {
    console.error("❌ Erreur Dashboard régional:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

