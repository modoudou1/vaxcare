import mongoose, { Document, Schema } from "mongoose";

export interface IReportPdf extends Document {
  title: string;
  description: string;
  region?: string;
  fileUrl: string;
  createdAt: Date;
}

const ReportPdfSchema = new Schema<IReportPdf>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  region: { type: String },
  fileUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IReportPdf>("ReportPdf", ReportPdfSchema);
