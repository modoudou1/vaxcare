import { Request, Response } from "express";
import mongoose from "mongoose";
import Campaign from "../models/Campaign";
import Child from "../models/Child";
import Vaccination from "../models/Vaccination";
import Vaccine from "../models/Vaccine";
import Region from "../models/Region";
import HealthCenter from "../models/HealthCenter";
import User from "../models/User";
import bcrypt from "bcryptjs";

export const seedSenegalData = async (_req: Request, res: Response) => {
  try {
    console.log("🇸🇳 Création des données complètes du Sénégal...");

    // 1. Nettoyer les données existantes
    await Child.deleteMany({});
    await Vaccination.deleteMany({});
    await Vaccine.deleteMany({});
    await Campaign.deleteMany({});
    await HealthCenter.deleteMany({});
    await Region.deleteMany({});
    console.log("🧹 Données existantes supprimées");

    // 2. Créer les vaccins
    const vaccines = await Vaccine.insertMany([
      {
        name: "BCG",
        description: "Vaccin contre la tuberculose",
        dosesRequired: 1,
      },
      {
        name: "Polio",
        description: "Vaccin contre la poliomyélite",
        dosesRequired: 3,
      },
      {
        name: "DTP",
        description: "Diphtérie, Tétanos, Coqueluche",
        dosesRequired: 3,
      },
      {
        name: "Rougeole",
        description: "Vaccin contre la rougeole",
        dosesRequired: 2,
      },
      {
        name: "Hépatite B",
        description: "Vaccin contre l'hépatite B",
        dosesRequired: 3,
      },
      {
        name: "Fièvre jaune",
        description: "Vaccin contre la fièvre jaune",
        dosesRequired: 1,
      },
      {
        name: "Méningite",
        description: "Vaccin contre la méningite",
        dosesRequired: 1,
      },
    ]);
    console.log(`✅ ${vaccines.length} vaccins créés`);

    // 3. Régions du Sénégal
    const regionsSenegal = [
      "Dakar",
      "Thiès",
      "Diourbel",
      "Fatick",
      "Kaolack",
      "Kolda",
      "Louga",
      "Matam",
      "Saint-Louis",
      "Tambacounda",
      "Ziguinchor",
      "Kaffrine",
      "Kédougou",
      "Sédhiou",
    ];

    // 3b. Insérer les régions
    await Region.insertMany(regionsSenegal.map((name) => ({ name })));
    console.log(`✅ ${regionsSenegal.length} régions créées`);

    // 3c. Centres de santé par région (exemples)
    const healthCentersByRegion: Record<string, string[]> = {
      "Dakar": [
        "Centre de santé HLM Dakar",
        "Poste de santé Ouakam",
        "Centre de santé Grand Yoff",
      ],
      "Thiès": [
        "Centre de santé Thiès Nord",
        "Poste de santé Keur Cheikh",
      ],
      "Saint-Louis": [
        "Centre de santé Sor",
        "Poste de santé Pikine Saint-Louis",
      ],
    };

    const centersToInsert: any[] = [];
    Object.entries(healthCentersByRegion).forEach(([region, centers]) => {
      centers.forEach((name) =>
        centersToInsert.push({
          name,
          region,
          address: `${name}, ${region}`,
          createdBy: new mongoose.Types.ObjectId(),
        })
      );
    });
    if (centersToInsert.length > 0) {
      await HealthCenter.insertMany(centersToInsert);
      console.log(`✅ ${centersToInsert.length} centres de santé créés`);
    }

    // 4. Créer des enfants dans toutes les régions du Sénégal
    const children = [];
    const childrenPerRegion = 50; // 50 enfants par région

    for (
      let regionIndex = 0;
      regionIndex < regionsSenegal.length;
      regionIndex++
    ) {
      const region = regionsSenegal[regionIndex];

      for (let i = 0; i < childrenPerRegion; i++) {
        const child = new Child({
          name: `Enfant${i + 1} Famille${region}${i + 1}`,
          birthDate: new Date(
            2020 + Math.floor(Math.random() * 4),
            Math.floor(Math.random() * 12),
            Math.floor(Math.random() * 28) + 1
          ),
          gender: Math.random() > 0.5 ? "M" : "F",
          region: region,
          parentName: `Parent${region}${i + 1}`,
          parentPhone: `+221${Math.floor(Math.random() * 90000000) + 10000000}`,
          createdBy: new mongoose.Types.ObjectId(), // ID fictif (agent)
        });
        children.push(child);
      }
    }

    const savedChildren = await Child.insertMany(children);
    console.log(
      `✅ ${savedChildren.length} enfants créés dans ${regionsSenegal.length} régions`
    );

    // 5. Créer des vaccinations pour tous les mois de l'année 2024
    const vaccinations = [];
    const months = [
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

    // Nombre de vaccinations par mois (simulation réaliste)
    const vaccinationsPerMonth = [
      120, 95, 140, 110, 160, 180, 200, 220, 190, 170, 150, 130,
    ];

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const month = monthIndex + 1; // 1-12
      const year = 2024;
      const vaccinationsCount = vaccinationsPerMonth[monthIndex];

      for (let i = 0; i < vaccinationsCount; i++) {
        const child =
          savedChildren[Math.floor(Math.random() * savedChildren.length)];
        const vaccine = vaccines[Math.floor(Math.random() * vaccines.length)];
        const day = Math.floor(Math.random() * 28) + 1;

        const vaccination = new Vaccination({
          child: child._id,
          vaccine: vaccine._id,
          date: new Date(year, month - 1, day),
          doseNumber: Math.floor(Math.random() * vaccine.dosesRequired) + 1,
        });
        vaccinations.push(vaccination);
      }
    }

    const savedVaccinations = await Vaccination.insertMany(vaccinations);
    console.log(
      `✅ ${savedVaccinations.length} vaccinations créées pour tous les mois de 2024`
    );

    // 6. Créer des campagnes actives
    const campaigns = await Campaign.insertMany([
      {
        title: "Campagne BCG Nationale 2024-2025",
        description:
          "Campagne nationale de vaccination BCG pour tous les enfants",
        startDate: new Date(2024, 0, 1), // 1er janvier 2024
        endDate: new Date(2025, 11, 31), // 31 décembre 2025
        region: "Toutes",
        createdBy: new mongoose.Types.ObjectId(),
      },
      {
        title: "Campagne Polio Dakar-Thiès",
        description:
          "Campagne de vaccination Polio dans les régions de Dakar et Thiès",
        startDate: new Date(2024, 6, 1), // 1er juillet 2024
        endDate: new Date(2025, 5, 30), // 30 juin 2025
        region: "Dakar, Thiès",
        createdBy: new mongoose.Types.ObjectId(),
      },
      {
        title: "Campagne DTP Sud",
        description: "Campagne de vaccination DTP dans les régions du Sud",
        startDate: new Date(2024, 8, 1), // 1er septembre 2024
        endDate: new Date(2025, 7, 31), // 31 août 2025
        region: "Ziguinchor, Kolda, Sédhiou",
        createdBy: new mongoose.Types.ObjectId(),
      },
    ]);
    console.log(`✅ ${campaigns.length} campagnes créées`);

    // 7. Statistiques par région
    const regionStats = await Child.aggregate([
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
          retard: { $subtract: ["$totalChildren", "$vaccinatedChildren"] },
          coverageRate: {
            $multiply: [
              { $divide: ["$vaccinatedChildren", "$totalChildren"] },
              100,
            ],
          },
        },
      },
      { $sort: { retard: -1 } },
    ]);

    console.log("\n📊 Statistiques par région:");
    regionStats.forEach((stat, index) => {
      console.log(
        `${index + 1}. ${stat.region}: ${
          stat.retard
        } enfants non vaccinés (${stat.coverageRate.toFixed(1)}% couverture)`
      );
    });

    res.json({
      success: true,
      message: "Données complètes du Sénégal créées avec succès",
      data: {
        vaccines: vaccines.length,
        children: savedChildren.length,
        vaccinations: savedVaccinations.length,
        campaigns: campaigns.length,
        regions: regionsSenegal.length,
        topRegions: regionStats.slice(0, 5),
        monthlyData: months.map((month, index) => ({
          month: month,
          value: vaccinationsPerMonth[index],
        })),
      },
    });
  } catch (error) {
    console.error("❌ Erreur création données Sénégal:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
      details: error,
    });
  }
};

// 👇 Seed de démo lié à l'agent connecté: crée 5 enfants et des vaccinations récentes
export const seedAgentDemo = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as { id: string; region?: string; email: string; healthCenter?: string };
    if (!user?.id) {
      return res.status(400).json({ success: false, message: "Utilisateur non défini" });
    }

    // S'assurer que des vaccins existent
    let vaccines = await Vaccine.find({}).limit(4);
    if (vaccines.length === 0) {
      vaccines = await Vaccine.insertMany([
        { name: "BCG", description: "Tuberculose", dosesRequired: 1 },
        { name: "Polio", description: "Poliomyélite", dosesRequired: 3 },
        { name: "Rougeole", description: "Rougeole", dosesRequired: 2 },
        { name: "Fièvre Jaune", description: "Fièvre jaune", dosesRequired: 1 },
      ]);
    }

    const region = user.region || "Dakar";
    const healthCenter = user.healthCenter;
    const agentId = new mongoose.Types.ObjectId(user.id);

    const childrenDocs = await Child.insertMany(
      Array.from({ length: 5 }).map((_, i) => ({
        name: `Enfant Agent ${i + 1}`,
        birthDate: new Date(2021 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        gender: Math.random() > 0.5 ? "M" : "F",
        parentName: `Parent Agent ${i + 1}`,
        parentPhone: `+2217${Math.floor(Math.random() * 9000000) + 1000000}`,
        region,
        healthCenter,
        createdBy: agentId,
      }))
    );

    const now = new Date();
    const vaccsToInsert: any[] = [];
    for (const child of childrenDocs) {
      const doses = 1 + Math.floor(Math.random() * 2);
      for (let d = 0; d < doses; d++) {
        const vaccine = vaccines[Math.floor(Math.random() * vaccines.length)];
        const date = new Date(now.getFullYear(), now.getMonth() - Math.floor(Math.random() * 4), Math.max(1, Math.floor(Math.random() * 28)));
        vaccsToInsert.push({ child: child._id, vaccine: vaccine._id, date, doseNumber: 1 });
      }
    }

    const savedVaccinations = await Vaccination.insertMany(vaccsToInsert);

    return res.json({
      success: true,
      message: "Données de démo créées pour l'agent",
      created: { children: childrenDocs.length, vaccinations: savedVaccinations.length },
    });
  } catch (error) {
    console.error("❌ Erreur seedAgentDemo:", error);
    return res.status(500).json({ success: false, error: "Erreur serveur", details: error });
  }
};

// 👇 Crée un compte régional par région avec un email unique et mot de passe par défaut
export const seedRegionalAccounts = async (_req: Request, res: Response) => {
  try {
    const regions = await Region.find({}).select("name");
    if (regions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Aucune région trouvée. Lancez d'abord /api/seed/senegal pour créer les régions.",
      });
    }

    const passwordPlain = "123456";
    const passwordHash = await bcrypt.hash(passwordPlain, 10);

    const results: Array<{ region: string; email: string; password: string }> = [];

    for (const r of regions) {
      const slug = r.name
        .toLowerCase()
        .normalize("NFD").replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const email = `regional-${slug}@vacxcare.sn`;

      const existing = await User.findOne({ email });
      if (existing) {
        results.push({ region: r.name, email, password: passwordPlain });
        continue;
      }

      await User.create({
        email,
        password: passwordHash,
        role: "regional",
        region: r.name,
      } as any);

      results.push({ region: r.name, email, password: passwordPlain });
    }

    return res.json({ success: true, accounts: results });
  } catch (error) {
    console.error("❌ Erreur seedRegionalAccounts:", error);
    return res.status(500).json({ success: false, error: "Erreur serveur", details: error });
  }
};
