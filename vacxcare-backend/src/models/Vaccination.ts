import mongoose, { Document, Schema } from "mongoose";
import { IChild } from "./Child";
import { IVaccine } from "./Vaccine";

/* -------------------------------------------------------------------------- */
/* 🧬 Interface TypeScript                                                   */
/* -------------------------------------------------------------------------- */
export interface IVaccination extends Document {
  child: IChild["_id"];
  vaccine?: IVaccine["_id"]; // Optionnel pour vaccinations historiques
  vaccineName?: string; // Nom du vaccin pour vaccinations historiques
  dose?: string; // Dose du vaccin (1ère, 2ème, etc.)
  administeredDate?: Date; // Date d'administration pour vaccinations historiques
  scheduledDate?: Date;
  doneDate?: Date;
  doseNumber?: number;
  region?: string;
  healthCenter?: mongoose.Types.ObjectId; // Référence vers HealthCenter
  district?: string;
  givenBy?: mongoose.Types.ObjectId;
  status: "scheduled" | "done" | "cancelled" | "planned" | "missed";
  isLate?: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* 🧱 Schéma Mongoose                                                        */
/* -------------------------------------------------------------------------- */
const VaccinationSchema = new Schema<IVaccination>(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
    },
    vaccine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vaccine",
      required: false, // Optionnel pour permettre l'enregistrement avec vaccineName seulement
    },
    vaccineName: { type: String, trim: true }, // Nom du vaccin pour vaccinations historiques
    dose: { type: String, trim: true }, // Dose (1ère, 2ème, etc.)
    administeredDate: { type: Date }, // Date d'administration réelle
    scheduledDate: { type: Date, default: null },
    doneDate: { type: Date, default: null },
    doseNumber: { type: Number },
    region: { type: String, trim: true },
    healthCenter: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "HealthCenter",
      required: false 
    },
    district: { type: String, trim: true },
    givenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["scheduled", "done", "cancelled", "planned", "missed"],
      default: "scheduled",
      required: true,
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

/* -------------------------------------------------------------------------- */
/* ⚙️ Index et Virtuals optimisés                                           */
/* -------------------------------------------------------------------------- */

// 🔹 Index combiné pour accélérer les requêtes de prochains vaccins
VaccinationSchema.index(
  { child: 1, status: 1, scheduledDate: 1 },
  { name: "child_scheduled_index" }
);

// 🔹 Index pour recherche et filtrage
VaccinationSchema.index({ child: 1, vaccine: 1, status: 1 });
VaccinationSchema.index({ region: 1 });
VaccinationSchema.index({ healthCenter: 1 });

// 🔹 Champ virtuel : savoir si la vaccination est en retard
VaccinationSchema.virtual("isLate").get(function (this: IVaccination) {
  if (this.status === "done" || !this.scheduledDate) return false;
  return this.scheduledDate < new Date();
});

// 🔹 Inclure les virtuals dans les réponses JSON
VaccinationSchema.set("toJSON", { virtuals: true });
VaccinationSchema.set("toObject", { virtuals: true });

/* -------------------------------------------------------------------------- */
/* 🚀 Export du modèle                                                      */
/* -------------------------------------------------------------------------- */
const Vaccination = mongoose.model<IVaccination>(
  "Vaccination",
  VaccinationSchema
);
export default Vaccination;
