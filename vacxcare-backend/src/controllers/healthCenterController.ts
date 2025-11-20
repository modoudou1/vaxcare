import { Request, Response } from "express";
import HealthCenter from "../models/HealthCenter";
import Region from "../models/Region";

// ✅ Créer un centre de santé
// ✅ Créer un centre de santé
export const createHealthCenter = async (req: Request, res: Response) => {
  try {
    const { name, address, region, commune, type, districtName } = req.body as {
      name?: string;
      address?: string;
      region?: string;
      commune?: string;
      type?: string;
      districtName?: string;
    };

    const user = (req as any).user as
      | {
          role?: string;
          region?: string;
          healthCenter?: string;
          agentLevel?: string;
        }
      | undefined;

    let finalRegion = region;
    let finalDistrictName = districtName;

    // ✅ Agents : seuls les agents de niveau district sont autorisés
    // On considère également comme "district" les anciens comptes agents sans agentLevel défini.
    if (
      user?.role === "agent" &&
      user.agentLevel &&
      user.agentLevel !== "district"
    ) {
      return res.status(403).json({
        error:
          "Seuls les agents de district peuvent créer des acteurs de santé.",
      });
    }

    // ✅ Districts : on déduit région + districtName depuis l'utilisateur
    if (user?.role === "district") {
      if (!user.region || !user.healthCenter) {
        return res.status(400).json({
          error:
            "Région ou centre de santé du district non défini. Impossible de créer un acteur.",
        });
      }

      if (type === "district") {
        return res.status(400).json({
          error: "Un district ne peut pas créer un centre de type 'district'.",
        });
      }

      finalRegion = user.region;
      finalDistrictName = user.healthCenter;
    }
    // ✅ Agents de niveau district (ou sans agentLevel explicite) : on déduit région + districtName depuis l'utilisateur
    else if (
      user?.role === "agent" &&
      (!user.agentLevel || user.agentLevel === "district")
    ) {
      if (!user.region || !user.healthCenter) {
        return res.status(400).json({
          error:
            "Région ou centre de santé de l'agent district non défini. Impossible de créer un acteur.",
        });
      }

      if (type === "district") {
        return res.status(400).json({
          error: "Un agent de district ne peut pas créer un centre de type 'district'.",
        });
      }

      finalRegion = user.region;
      finalDistrictName = user.healthCenter;
    }

    if (!name || !address || !finalRegion) {
      return res.status(400).json({ error: "Nom, adresse et région requis" });
    }

    const existingRegion = await Region.findOne({ name: finalRegion });
    if (!existingRegion) {
      return res
        .status(400)
        .json({ error: `La région "${region}" n'existe pas.` });
    }

    const existing = await HealthCenter.findOne({ name, region: finalRegion });
    if (existing) {
      return res.status(409).json({
        error: `Le centre "${name}" existe déjà dans la région "${region}".`,
      });
    }

    const healthCenter = new HealthCenter({
      name,
      address,
      region: finalRegion,
      // Champs optionnels supplémentaires
      commune,
      type,
      districtName: finalDistrictName,
    });
    await healthCenter.save();

    res.status(201).json({ message: "Centre créé", healthCenter });
  } catch (err: any) {
    res
      .status(400)
      .json({ error: "Impossible de créer le centre", details: err.message });
  }
};
// ✅ Lister tous les centres (filtré par région pour les régionaux)
export const getHealthCenters = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as
      | {
          role?: string;
          region?: string;
          healthCenter?: string;
          agentLevel?: string;
        }
      | undefined;

    const query: any = {};

    // Filtre par région pour les utilisateurs régionaux
    if (user?.role === "regional" && user?.region) {
      query.region = user.region;
    }

    // Filtre par district pour les utilisateurs de rôle district
    if (user?.role === "district" && user.healthCenter) {
      query.districtName = user.healthCenter;
    }

    // Filtre par district pour les agents de district : acteurs de leur district uniquement
    // Ancienne génération d'agents sans agentLevel explicite : considérés comme district.
    if (
      user?.role === "agent" &&
      (!user.agentLevel || user.agentLevel === "district") &&
      user.healthCenter
    ) {
      query.districtName = user.healthCenter;
    }

    const centers = await HealthCenter.find(query).sort({ region: 1, name: 1 });
    res.json(centers);
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

// ✅ Récupérer un centre par ID
export const getHealthCenterById = async (req: Request, res: Response) => {
  try {
    const center = await HealthCenter.findById(req.params.id);
    if (!center) {
      return res.status(404).json({ error: "Centre non trouvé" });
    }
    res.json(center);
  } catch (err: any) {
    // Ajout du type 'any' pour l'erreur
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// ✅ Mettre à jour un centre
export const updateHealthCenter = async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const center = await HealthCenter.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!center) {
      return res.status(404).json({ error: "Centre non trouvé" });
    }

    res.json({ message: "Centre mis à jour", healthCenter: center });
  } catch (err: any) {
    // Ajout du type 'any' pour l'erreur
    res.status(400).json({ error: "Impossible de mettre à jour le centre" });
  }
};

// ✅ Supprimer un centre
export const deleteHealthCenter = async (req: Request, res: Response) => {
  try {
    const center = await HealthCenter.findById(req.params.id);
    if (!center) {
      return res.status(404).json({ error: "Centre non trouvé" });
    }

    await center.deleteOne();
    res.json({ message: "Centre supprimé avec succès" });
  } catch (err: any) {
    // Ajout du type 'any' pour l'erreur
    res.status(400).json({ error: "Impossible de supprimer le centre" });
  }
};

// Recherche un centre de santé par nom
// Recherche un centre de santé par nom
// Recherche un centre de santé par nom
export const getHealthCenterByName = async (req: Request, res: Response) => {
  try {
    const { name } = req.params; // Récupère le nom depuis les paramètres de la route
    const center = await HealthCenter.findOne({ name }); // Recherche le centre par nom

    if (!center) {
      return res.status(404).json({ error: "Centre de santé non trouvé" }); // Centre non trouvé
    }

    // Si le centre est trouvé, renvoie les détails avec l'_id
    res.json({ healthCenter: center });
  } catch (err: any) {
    console.error("❌ Erreur lors de la recherche du centre :", err.message);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};
