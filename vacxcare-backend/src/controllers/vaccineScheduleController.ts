import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import VaccineSchedule from "../models/VaccineSchedule";

// ➕ Créer une tranche vaccinale ou un âge spécifique
// ➕ Créer une tranche vaccinale
export const createVaccineSchedule = async (req: Request, res: Response) => {
  try {
    const { age, minAge, maxAge, unit, vaccines, description, specificAge } =
      req.body;
    const user = (req as any).user;

    // Compatibilité et validation
    const min = specificAge ?? minAge ?? age ?? 0; // Utilisation de specificAge si disponible, sinon minAge, sinon age
    const max = maxAge ?? null;

    // Si specificAge est donné, on met minAge à la même valeur
    const finalMinAge = specificAge || min;

    // Prévenir l'insertion d'un `age: null` ou `specificAge: null` sans valeur valide
    if (finalMinAge === null || finalMinAge === undefined) {
      return res.status(400).json({ message: "Âge ou specificAge invalide" });
    }

    // Création de la tranche
    const schedule = new VaccineSchedule({
      minAge: finalMinAge, // Utilisation de minAge ou specificAge
      maxAge: max,
      unit: unit || "months",
      vaccines,
      description,
      specificAge: specificAge || null, // Enregistrement de l'âge spécifique si disponible
      createdBy: user?.id,
    });

    await schedule.save();
    res.status(201).json({ message: "Tranche ajoutée", schedule });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};

// 📋 Lire toutes les tranches
export const getVaccineSchedule = async (_req: Request, res: Response) => {
  try {
    const schedules = await VaccineSchedule.find().sort({ unit: 1, minAge: 1 });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};

// 🔎 Lire une tranche par âge exact
export const getVaccineByAge = async (req: Request, res: Response) => {
  try {
    const { age } = req.params; // âge de l'enfant
    const { unit } = req.query; // unité de temps (mois, années...)

    const ageNumber = Number(age);
    if (isNaN(ageNumber)) {
      return res.status(400).json({ message: "Âge invalide" });
    }

    const unitToUse = (unit as string) || "months"; // Par défaut, utiliser 'months'

    // Recherche par âge spécifique en priorité
    const schedule = await VaccineSchedule.findOne({
      $or: [
        { specificAge: ageNumber }, // Si un âge spécifique est trouvé
        {
          minAge: { $lte: ageNumber },
          $or: [{ maxAge: { $gte: ageNumber } }, { maxAge: null }],
          unit: unitToUse,
        },
      ],
    });

    if (!schedule) {
      return res.status(404).json({ message: "Pas de vaccin pour cet âge" });
    }

    res.json(schedule);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};

// ⏳ Lire les tranches d’un intervalle d’âge
export const getVaccineByRange = async (req: Request, res: Response) => {
  try {
    const { min, max, unit } = req.query;

    // Recherche de tranches correspondant à l'intervalle d'âge
    const schedules = await VaccineSchedule.find({
      minAge: { $gte: Number(min) },
      maxAge: { $lte: Number(max) },
      unit: (unit as string) || "months",
    });

    res.json(schedules);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};

// ✏️ Modifier une tranche
export const updateVaccineSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, vaccine, minAge, maxAge, unit, vaccines, description } =
      req.body;

    const schedule = await VaccineSchedule.findById(id);
    if (!schedule)
      return res.status(404).json({ message: "Tranche introuvable" });

    if (action === "removeVaccine" && vaccine) {
      schedule.vaccines = schedule.vaccines.filter((v) => v !== vaccine);
    } else {
      if (minAge !== undefined) schedule.minAge = minAge;
      if (maxAge !== undefined) schedule.maxAge = maxAge;
      if (unit !== undefined) schedule.unit = unit;
      if (vaccines !== undefined) schedule.vaccines = vaccines;
      if (description !== undefined) schedule.description = description;
    }

    await schedule.save();
    res.json({ message: "Tranche mise à jour", schedule });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};

// ❌ Supprimer une tranche
export const deleteVaccineSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await VaccineSchedule.findByIdAndDelete(id);
    if (!deleted)
      return res.status(404).json({ message: "Tranche introuvable" });
    res.json({ message: "Tranche supprimée", deleted });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};

// 📤 Export PDF du calendrier vaccinal
export const exportVaccineSchedulePdf = async (
  _req: Request,
  res: Response
) => {
  try {
    const schedules = await VaccineSchedule.find().sort({ unit: 1, minAge: 1 });

    if (schedules.length === 0)
      return res.status(404).json({ message: "Aucune tranche trouvée" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=calendrier_vaccinal.pdf"
    );

    const doc = new PDFDocument();
    doc.pipe(res);

    doc
      .fontSize(20)
      .text("📅 Calendrier Vaccinal National", { align: "center" })
      .moveDown();

    schedules.forEach((s, idx) => {
      const label =
        s.maxAge && s.maxAge > s.minAge
          ? `${s.minAge}–${s.maxAge} ${s.unit}`
          : `${s.minAge} ${s.unit}`;

      doc.fontSize(14).text(`${idx + 1}. Âge : ${label}`, { underline: true });
      doc
        .fontSize(12)
        .text(`Vaccins : ${s.vaccines.join(" + ")}`)
        .moveDown(0.5);
      if (s.description) doc.text(`📝 Notes : ${s.description}`).moveDown();
      else doc.moveDown();
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: "Erreur PDF", error: err });
  }
};
