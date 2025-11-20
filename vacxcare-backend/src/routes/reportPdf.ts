import express from "express";
import {
  downloadReportPdf,
  exportReportPdf, // ⚡ maintenant envoi direct
  getReportPdfs,
  importReportPdfCsv,
} from "../controllers/reportPdfController";

const router = express.Router();

router.post("/import", importReportPdfCsv);
router.get("/export/pdf", exportReportPdf); // ⚡ envoie direct
router.get("/", getReportPdfs);
router.get("/download", downloadReportPdf); // garde aussi le download disque

export default router;
