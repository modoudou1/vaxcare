import { Request, Response } from "express";
import HealthAdvice from "../models/HealthAdvice";

// ➕ Créer un conseil santé
export const createAdvice = async (req: Request, res: Response) => {
  try {
    const advice = new HealthAdvice(req.body);
    await advice.save();
    res.status(201).json({ message: "Conseil créé avec succès", advice });
  } catch (err) {
    res
      .status(400)
      .json({ error: "Impossible de créer le conseil", details: err });
  }
};

// 📋 Récupérer tous les conseils
export const getAllAdvice = async (req: Request, res: Response) => {
  try {
    const advices = await HealthAdvice.find();
    res.json(advices);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// 🔎 Récupérer un conseil par ID
export const getAdviceById = async (req: Request, res: Response) => {
  try {
    const advice = await HealthAdvice.findById(req.params.id);
    if (!advice) return res.status(404).json({ error: "Conseil introuvable" });
    res.json(advice);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// ✏️ Mettre à jour un conseil
export const updateAdvice = async (req: Request, res: Response) => {
  try {
    const advice = await HealthAdvice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!advice) return res.status(404).json({ error: "Conseil introuvable" });
    res.json({ message: "Conseil mis à jour", advice });
  } catch (err) {
    res.status(400).json({ error: "Impossible de mettre à jour" });
  }
};

// ❌ Supprimer un conseil
export const deleteAdvice = async (req: Request, res: Response) => {
  try {
    const advice = await HealthAdvice.findByIdAndDelete(req.params.id);
    if (!advice) return res.status(404).json({ error: "Conseil introuvable" });
    res.json({ message: "Conseil supprimé" });
  } catch (err) {
    res.status(400).json({ error: "Impossible de supprimer" });
  }
};
