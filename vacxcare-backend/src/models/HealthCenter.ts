import { Document, Schema, model } from "mongoose";

export type HealthCenterType =
  | "district"
  | "health_center"
  | "health_post"
  | "health_case"
  | "clinic"
  | "company_infirmary"
  | "other";

export interface IHealthCenter extends Document {
  name: string;
  address: string;
  region: string; // peut être lié à un ObjectId de la région
  commune?: string;
  type?: HealthCenterType;
  districtName?: string;
}

const healthCenterSchema = new Schema<IHealthCenter>(
  {
    name: { type: String, required: true, unique: true }, // Nom unique
    address: { type: String, required: true }, // Adresse obligatoire
    region: { type: String, required: true }, // Région obligatoire
    commune: { type: String },
    type: {
      type: String,
      enum: [
        "district",
        "health_center",
        "health_post",
        "health_case",
        "clinic",
        "company_infirmary",
        "other",
      ],
      default: undefined,
    },
    districtName: { type: String },
  },
  { timestamps: true } // Ajoute les timestamps pour créer des dates de création et mise à jour
);

export default model<IHealthCenter>("HealthCenter", healthCenterSchema);
