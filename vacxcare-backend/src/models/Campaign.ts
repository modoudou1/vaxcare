import mongoose, { Document, Schema } from "mongoose";

export interface IMedia {
  url: string;
  type: "video" | "pdf";
}

export interface ICampaign extends Document {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  region?: string;
  targetVaccine?: string;
  targetAgeGroup?: string;
  targetPopulation?: number;
  vaccinatedCount?: number;
  status: "planned" | "ongoing" | "completed" | "cancelled";
  createdBy: mongoose.Types.ObjectId;
  medias: IMedia[];
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema: Schema = new Schema<IMedia>(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ["video", "pdf"], required: true },
  },
  { _id: false } // pas besoin d'un ID interne pour chaque média
);

const CampaignSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    region: { type: String },
    targetVaccine: { type: String }, // Optionnel maintenant
    targetAgeGroup: { type: String },
    targetPopulation: { type: Number, min: 0 },
    vaccinatedCount: { type: Number, default: 0, min: 0 },
    status: { 
      type: String, 
      enum: ["planned", "ongoing", "completed", "cancelled"],
      default: "planned"
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    medias: { type: [MediaSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<ICampaign>("Campaign", CampaignSchema);
