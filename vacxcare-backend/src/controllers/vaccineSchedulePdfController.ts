import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import VaccineSchedule from "../models/VaccineSchedule";

// 📤 Export calendrier vaccinal national en PDF
export const exportVaccineSchedulePdf = async (
  _req: Request,
  res: Response
) => {
  try {
    const schedules = await VaccineSchedule.find();

    if (!schedules || schedules.length === 0) {
      return res.status(404).json({ message: "Aucune tranche trouvée" });
    }

    // 🔹 Fonction pour convertir en mois pour trier
    const ageToMonths = (age: number, unit: string) => {
      if (unit === "weeks") return age / 4.3; // approx
      if (unit === "years") return age * 12;
      return age; // months
    };

    // 🔹 Tri par unité puis âge
    schedules.sort((a, b) => {
      const aAge = ageToMonths(a.minAge ?? 0, a.unit);
      const bAge = ageToMonths(b.minAge ?? 0, b.unit);
      return aAge - bAge;
    });

    // 🔎 Fonction pour formatter l’âge (même que front)
    function formatAge(item: any) {
      const ageMin = item.minAge ?? item.age;
      const ageMax = item.maxAge;
      const unitLabel =
        item.unit === "weeks"
          ? "semaines"
          : item.unit === "months"
          ? "mois"
          : "ans";

      if (ageMin === 0 && item.unit === "weeks") return "Naissance";

      if (ageMax !== undefined && ageMax !== null) {
        return `${ageMin}–${ageMax} ${unitLabel}`;
      }

      if (ageMin !== undefined && ageMin !== null) {
        return `${ageMin} ${unitLabel}`;
      }

      return "Âge non défini";
    }

    // 📥 Configurer en-têtes HTTP
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=calendrier_vaccinal.pdf"
    );

    // === Créer document PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.pipe(res);

    // === Titre ===
    doc
      .fontSize(22)
      .fillColor("#0A1A33")
      .font("Helvetica-Bold")
      .text("Calendrier Vaccinal National", { align: "center" });
    doc.moveDown(2);

    // === Table header ===
    const startX = 50;
    let y = 150;
    const colAge = 150;
    const colVaccins = 350;

    doc.rect(startX, y, 500, 30).fill("#2563EB").stroke();
    doc.fillColor("white").fontSize(14).font("Helvetica-Bold");
    doc.text("Âge", startX + 10, y + 8);
    doc.text("Vaccins", startX + colAge + 10, y + 8);

    y += 35;

    // === Table content ===
    doc.font("Helvetica").fontSize(12).fillColor("black");

    schedules.forEach((s, i) => {
      const ageLabel = formatAge(s);

      // Fond alterné
      if (i % 2 === 0) {
        doc.rect(startX, y, 500, 25).fill("#F3F4F6").stroke();
        doc.fillColor("black");
      }

      // Texte colonnes
      doc.text(ageLabel, startX + 10, y + 7, { width: colAge - 20 });
      doc.text(s.vaccines.join(" + "), startX + colAge + 10, y + 7, {
        width: colVaccins - 20,
      });

      y += 25;
      doc.fillColor("black");
    });

    // ✅ Fin du PDF
    doc.end();
  } catch (err) {
    console.error("Erreur génération PDF :", err);
    res.status(500).json({ message: "Erreur génération PDF", error: err });
  }
};
