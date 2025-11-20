import mongoose, { Document, Schema } from "mongoose";

export interface IReport extends Document {
  title: string;
  description: string;
  fileUrl: string;
  createdBy: mongoose.Types.ObjectId;
}

const ReportSchema = new Schema<IReport>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    fileUrl: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// ✅ On compile uniquement Report
export default mongoose.models.Report ||
  mongoose.model<IReport>("Report", ReportSchema);
