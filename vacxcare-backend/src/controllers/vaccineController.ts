import { Request, Response } from "express";
import Vaccine from "../models/Vaccine";

// ➕ Créer un vaccin
export const createVaccine = async (req: Request, res: Response) => {
  try {
    const { name, description, dosesRequired } = req.body;
    const vaccine = new Vaccine({ name, description, dosesRequired });
    await vaccine.save();
    res.status(201).json({ message: "Vaccin créé avec succès", vaccine });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};
export const getVaccineById = async (req: Request, res: Response) => {
  try {
    const vaccine = await Vaccine.findById(req.params.id);
    if (!vaccine) {
      return res.status(404).json({ message: "Vaccin introuvable" });
    }
    res.json(vaccine);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};

// 📋 Obtenir tous les vaccins
export const getVaccines = async (req: Request, res: Response) => {
  try {
    const vaccines = await Vaccine.find();
    res.json(vaccines);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};

// ✏️ Mettre à jour un vaccin
export const updateVaccine = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, dosesRequired } = req.body;
    const vaccine = await Vaccine.findByIdAndUpdate(
      id,
      { name, description, dosesRequired },
      { new: true }
    );
    if (!vaccine) {
      return res.status(404).json({ message: "Vaccin non trouvé" });
    }
    res.json({ message: "Vaccin mis à jour", vaccine });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};

// 🗑️ Supprimer un vaccin
export const deleteVaccine = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vaccine = await Vaccine.findByIdAndDelete(id);
    if (!vaccine) {
      return res.status(404).json({ message: "Vaccin non trouvé" });
    }
    res.json({ message: "Vaccin supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};
