import csvParser from "csv-parser";
import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import ReportPdf from "../models/ReportPdf";

// ✅ Type pour une ligne CSV
interface ReportRow {
  title: string;
  description: string;
  region?: string;
  fileUrl: string;
  createdAt: string;
}

// 📥 Import CSV → DB
export const importReportPdfCsv = async (_req: Request, res: Response) => {
  try {
    const filePath = path.join(__dirname, "../documents/report.csv");

    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ message: "Fichier report.csv introuvable" });
    }

    const reports: ReportRow[] = [];

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row: ReportRow) => {
        reports.push(row);
      })
      .on("end", async () => {
        await ReportPdf.insertMany(
          reports.map((r) => ({
            title: r.title,
            description: r.description,
            region: r.region,
            fileUrl: r.fileUrl,
            createdAt: new Date(r.createdAt),
          }))
        );

        res.json({
          message: "Rapports importés avec succès",
          count: reports.length,
        });
      });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Erreur lors de l'import CSV", error: err });
  }
};

// 📤 Export en PDF
export const exportReportPdf = async (_req: Request, res: Response) => {
  try {
    const reports = await ReportPdf.find();

    if (!reports || reports.length === 0) {
      return res.status(404).json({ message: "Aucun rapport trouvé" });
    }

    const filePath = path.join(__dirname, "../documents/reportpdf.pdf");
    const doc = new PDFDocument();

    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(20).text("Rapports Vaccination", { align: "center" });
    doc.moveDown();

    reports.forEach((r, idx) => {
      doc.fontSize(14).text(`${idx + 1}. ${r.title}`, { underline: true });
      doc.fontSize(12).text(`Description: ${r.description}`);
      if (r.region) doc.text(`Région: ${r.region}`);
      doc.text(`Lien fichier: ${r.fileUrl}`);
      doc.text(`Créé le: ${new Date(r.createdAt).toLocaleString()}`);
      doc.moveDown();
    });

    doc.end();

    res.json({
      message: "PDF généré avec succès",
      file: "/documents/reportpdf.pdf",
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur génération PDF", error: err });
  }
};
// 📥 Télécharger le PDF déjà généré
export const downloadReportPdf = async (_req: Request, res: Response) => {
  try {
    const filePath = path.join(__dirname, "../documents/reportpdf.pdf");

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "Le fichier PDF n'existe pas encore. Génère-le d'abord.",
      });
    }

    res.download(filePath, "reportpdf.pdf"); // 📂 Téléchargement direct
  } catch (err) {
    res.status(500).json({ message: "Erreur téléchargement PDF", error: err });
  }
};

// 📋 Liste des rapports
export const getReportPdfs = async (_req: Request, res: Response) => {
  try {
    const reports = await ReportPdf.find();
    res.json(reports);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Erreur récupération rapports", error: err });
  }
};
