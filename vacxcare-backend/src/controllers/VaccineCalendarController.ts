import { Request, Response } from "express";
import VaccineCalendar from "../models/VaccineCalendar";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// ➕ Créer une entrée dans le calendrier vaccinal
export const createVaccineCalendar = async (req: Request, res: Response) => {
  try {
    const { vaccine, dose, ageUnit, minAge, maxAge, specificAge, description } = req.body;
    const user = (req as any).user; // L'utilisateur qui effectue l'action

    // Validation des données : on ne peut pas combiner `specificAge` avec `minAge`/`maxAge`
    if (specificAge && (minAge || maxAge)) {
      return res.status(400).json({
        error:
          "Ne combinez pas `specificAge` avec `minAge` ou `maxAge`. Utilisez l'un ou l'autre.",
      });
    }

    // Création de l'entrée dans le calendrier
    const calendarEntry = new VaccineCalendar({
      vaccine, // vaccine est un tableau de vaccins
      dose,
      ageUnit,
      minAge,
      maxAge: maxAge ?? null,
      specificAge: specificAge ?? null,
      description,
      createdBy: user.id,
    });

    await calendarEntry.save();
    res.status(201).json({
      message: "Calendrier vaccinal ajouté avec succès",
      calendarEntry,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};

// 📋 Récupérer les calendriers de vaccins pour un âge spécifique
export const getVaccineCalendar = async (req: Request, res: Response) => {
  try {
    const { specificAge } = req.query; // Age spécifique demandé

    let calendar;
    if (specificAge) {
      // Filtrer uniquement les entrées avec `specificAge` égal à la valeur demandée
      calendar = await VaccineCalendar.find({
        specificAge: Number(specificAge),
      }).sort({ minAge: 1 });
    } else {
      // Si aucun âge spécifique n'est fourni, on retourne tous les calendriers
      calendar = await VaccineCalendar.find().sort({ minAge: 1 });
    }

    res.json(calendar);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};

// ✏️ Mettre à jour un calendrier vaccinal
export const updateVaccineCalendar = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { vaccine, dose, ageUnit, minAge, maxAge, specificAge, description } = req.body;

    // Trouver et mettre à jour l'entrée du calendrier
    const updatedCalendar = await VaccineCalendar.findByIdAndUpdate(
      id,
      {
        vaccine,
        dose,
        ageUnit,
        minAge,
        maxAge,
        specificAge,
        description,
      },
      { new: true }
    );

    if (!updatedCalendar) {
      return res.status(404).json({ message: "Calendrier introuvable" });
    }

    res.json({ message: "Calendrier mis à jour avec succès", updatedCalendar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};

// ❌ Supprimer un calendrier vaccinal
export const deleteVaccineCalendar = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await VaccineCalendar.findByIdAndDelete(id);

    if (!deleted)
      return res.status(404).json({ message: "Calendrier introuvable" });

    res.json({ message: "Calendrier supprimé avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};

// 📄 Générer le PDF des calendriers vaccinaux
export const generateVaccineCalendarPDF = async (req: Request, res: Response) => {
  try {
    const calendars = await VaccineCalendar.find(); // Récupérer tous les calendriers

    const doc = new PDFDocument();
    const filePath = path.join(__dirname, "..", "uploads", "vaccine-calendar.pdf");
    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(18).text("Calendrier Vaccinal National", { align: "center" });
    doc.moveDown(2);

    calendars.forEach((calendar: any, index: number) => {
      doc.fontSize(12).text(`Calendrier ${index + 1}:`, { underline: true });
      doc.text(`Vaccins: ${calendar.vaccine.join(", ")}`);
      doc.text(`Dose: ${calendar.dose}`);
      doc.text(`Âge: ${calendar.minAge} ${calendar.ageUnit}`);
      if (calendar.maxAge) {
        doc.text(`- ${calendar.maxAge} ${calendar.ageUnit}`);
      }
      doc.text(`Description: ${calendar.description || 'Aucune'}`);
      doc.moveDown(1);
    });

    doc.end();

    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(500).send("Erreur lors du téléchargement du fichier PDF");
      } else {
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    res.status(500).send("Erreur lors de la génération du PDF");
  }
};