import { Request, Response } from "express";
import Region from "../models/Region";

// ➕ Créer une région (National uniquement)
export const createRegion = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Nom requis" });

    const exists = await Region.findOne({ name });
    if (exists) return res.status(409).json({ error: "Région déjà existante" });

    const region = new Region({ name });
    await region.save();

    res.status(201).json({ message: "Région créée", data: region });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 🔄 Mettre à jour en masse l'état actif/inactif des régions
export const updateRegionsStatus = async (req: Request, res: Response) => {
  try {
    const { updates } = req.body as { updates?: Array<{ id: string; active: boolean }> };
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "Aucune mise à jour fournie" });
    }

    const ops = updates
      .filter((u) => typeof u.id === "string" && typeof u.active === "boolean")
      .map((u) => ({
        updateOne: {
          filter: { _id: u.id },
          update: { $set: { active: u.active } },
        },
      }));

    if (ops.length === 0) {
      return res.status(400).json({ error: "Format des mises à jour invalide" });
    }

    await Region.bulkWrite(ops);
    return res.json({ message: "États des régions mis à jour" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// 📋 Lister toutes les régions
export const getRegions = async (req: Request, res: Response) => {
  try {
    const onlyActive = String(req.query.onlyActive || "false").toLowerCase() === "true";
    const filter = onlyActive
      ? { $or: [{ active: true }, { active: { $exists: false } }] }
      : {};
    const regions = await Region.find(filter).sort({ name: 1 });
    res.json({ data: regions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ Mettre à jour une région
export const updateRegion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const region = await Region.findByIdAndUpdate(id, { name }, { new: true });

    if (!region) {
      return res.status(404).json({ error: "Région introuvable" });
    }

    res.json({ message: "Région mise à jour", data: region });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 🗑️ Supprimer une région
export const deleteRegion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const region = await Region.findByIdAndDelete(id);
    if (!region) {
      return res.status(404).json({ error: "Région introuvable" });
    }

    res.json({ message: "Région supprimée avec succès" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
