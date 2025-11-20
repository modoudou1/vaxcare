import { Request, Response } from "express";
import Child from "../models/Child";

// ➕ Parent ajoute son enfant
export const createChildByParent = async (req: any, res: Response) => {
  try {
    const { name, birthDate, parentName, parentPhone } = req.body;

    if (!name || !birthDate || !parentName || !parentPhone) {
      return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    const child = new Child({
      name,
      birthDate,
      parentName,
      parentPhone,
      createdBy: req.user.id, // 👈 parent connecté
    });

    await child.save();

    res.status(201).json({ message: "Enfant ajouté avec succès", child });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};
