import { Request, Response } from "express";
import mongoose from "mongoose";
import Campaign from "../models/Campaign";
import Child from "../models/Child";
import Vaccination from "../models/Vaccination";
import Vaccine from "../models/Vaccine";

// Créer des enfants dans une région spécifique
export const createChildrenInRegion = async (req: Request, res: Response) => {
  try {
    const { region, count = 50 } = req.body;

    if (!region) {
      return res.status(400).json({
        success: false,
        message: "La région est requise",
      });
    }

    const children = [];
    for (let i = 0; i < count; i++) {
      const child = new Child({
        name: `Enfant${i + 1} ${region}${i + 1}`,
        birthDate: new Date(
          2020 + Math.floor(Math.random() * 4),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1
        ),
        gender: Math.random() > 0.5 ? "M" : "F",
        region: region,
        parentName: `Parent${region}${i + 1}`,
        parentPhone: `+221${Math.floor(Math.random() * 90000000) + 10000000}`,
        createdBy: new mongoose.Types.ObjectId(),
      });
      children.push(child);
    }

    const savedChildren = await Child.insertMany(children);

    res.json({
      success: true,
      message: `${savedChildren.length} enfants créés dans la région ${region}`,
      data: {
        region,
        childrenCreated: savedChildren.length,
        children: savedChildren.map((child) => ({
          id: child._id,
          name: child.name,
          region: child.region,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Erreur création enfants:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
      details: error,
    });
  }
};

// Créer des vaccinations pour un mois spécifique
export const createVaccinationsForMonth = async (
  req: Request,
  res: Response
) => {
  try {
    const { month, year = 2024, count = 100 } = req.body;

    if (!month || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Le mois doit être entre 1 et 12",
      });
    }

    // Récupérer tous les enfants et vaccins
    const children = await Child.find({});
    const vaccines = await Vaccine.find({});

    if (children.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Aucun enfant trouvé. Créez d'abord des enfants.",
      });
    }

    if (vaccines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Aucun vaccin trouvé. Créez d'abord des vaccins.",
      });
    }

    const vaccinations = [];
    for (let i = 0; i < count; i++) {
      const child = children[Math.floor(Math.random() * children.length)];
      const vaccine = vaccines[Math.floor(Math.random() * vaccines.length)];
      const day = Math.floor(Math.random() * 28) + 1;

      const vaccination = new Vaccination({
        child: child._id,
        vaccine: vaccine._id,
        date: new Date(year, month - 1, day),
        doseNumber:
          Math.floor(Math.random() * (vaccine.dosesRequired || 1)) + 1,
      });
      vaccinations.push(vaccination);
    }

    const savedVaccinations = await Vaccination.insertMany(vaccinations);

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

    res.json({
      success: true,
      message: `${savedVaccinations.length} vaccinations créées pour ${
        monthNames[month - 1]
      } ${year}`,
      data: {
        month: monthNames[month - 1],
        year,
        vaccinationsCreated: savedVaccinations.length,
        vaccinations: savedVaccinations.map((vacc) => ({
          id: vacc._id,
          child: vacc.child,
          vaccine: vacc.vaccine,
          date: vacc.date,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Erreur création vaccinations:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
      details: error,
    });
  }
};

// Créer un vaccin
export const createVaccine = async (req: Request, res: Response) => {
  try {
    const { name, description, dosesRequired = 1 } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Le nom du vaccin est requis",
      });
    }

    const vaccine = new Vaccine({
      name,
      description,
      dosesRequired,
    });

    const savedVaccine = await vaccine.save();

    res.json({
      success: true,
      message: `Vaccin ${name} créé avec succès`,
      data: {
        id: savedVaccine._id,
        name: savedVaccine.name,
        description: savedVaccine.description,
        dosesRequired: savedVaccine.dosesRequired,
      },
    });
  } catch (error) {
    console.error("❌ Erreur création vaccin:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
      details: error,
    });
  }
};

// Créer une campagne
export const createCampaign = async (req: Request, res: Response) => {
  try {
    const { title, description, startDate, endDate, region } = req.body;

    if (!title || !description || !startDate || !endDate || !region) {
      return res.status(400).json({
        success: false,
        message:
          "Tous les champs sont requis (title, description, startDate, endDate, region)",
      });
    }

    const campaign = new Campaign({
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      region,
      createdBy: new mongoose.Types.ObjectId(),
    });

    const savedCampaign = await campaign.save();

    res.json({
      success: true,
      message: `Campagne ${title} créée avec succès`,
      data: {
        id: savedCampaign._id,
        title: savedCampaign.title,
        description: savedCampaign.description,
        startDate: savedCampaign.startDate,
        endDate: savedCampaign.endDate,
        region: savedCampaign.region,
      },
    });
  } catch (error) {
    console.error("❌ Erreur création campagne:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
      details: error,
    });
  }
};

// Obtenir les statistiques actuelles
export const getCurrentStats = async (req: Request, res: Response) => {
  try {
    const totalChildren = await Child.countDocuments();
    const totalVaccinations = await Vaccination.countDocuments();
    const totalVaccines = await Vaccine.countDocuments();
    const totalCampaigns = await Campaign.countDocuments();

    // Campagnes actives
    const today = new Date();
    const activeCampaigns = await Campaign.countDocuments({
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    // Enfants vaccinés
    const vaccinatedChildren = await Vaccination.distinct("child").then(
      (uniqueChildren: any[]) => uniqueChildren.length
    );

    const coverageRate =
      totalChildren > 0
        ? Number(((vaccinatedChildren / totalChildren) * 100).toFixed(2))
        : 0;

    res.json({
      success: true,
      data: {
        totalChildren,
        totalVaccinations,
        totalVaccines,
        totalCampaigns,
        activeCampaigns,
        vaccinatedChildren,
        coverageRate,
      },
    });
  } catch (error) {
    console.error("❌ Erreur récupération stats:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
      details: error,
    });
  }
};
