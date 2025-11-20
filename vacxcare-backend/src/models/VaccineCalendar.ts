import { Document, Schema, model } from "mongoose";

export interface IVaccineCalendar extends Document {
  vaccine: string[]; // Liste des vaccins (tableau de chaînes)
  dose: string; // Dose spécifique (ex : "1ère dose", "2ème dose")
  ageUnit: "weeks" | "months" | "years"; // Unité de l'âge (semaine, mois, année)
  minAge?: number; // Âge minimal (pour les intervalles)
  maxAge?: number | null; // Âge maximal (pour les intervalles)
  specificAge?: number | null; // Âge spécifique
  description?: string; // Notes optionnelles
  createdBy: string; // ID de l'utilisateur créateur
  createdAt: Date;
  updatedAt: Date;
}
const vaccineCalendarSchema = new Schema<IVaccineCalendar>(
  {
    vaccine: { type: [String], required: true }, // Le champ vaccine devient un tableau de chaînes
    dose: { type: String, required: true },
    ageUnit: {
      type: String,
      enum: ["weeks", "months", "years"],
      required: true,
    },
    minAge: {
      type: Number,
      required: function () {
        // Requis uniquement si specificAge est null/undefined (0 autorisé)
        return this.specificAge == null;
      },
      default: null,
    },
    maxAge: {
      type: Number,
      required: function () {
        // Requis uniquement si specificAge est null/undefined (0 autorisé)
        return this.specificAge == null;
      },
      default: null,
    },
    specificAge: {
      type: Number,
      required: function () {
        // Requis si minAge et maxAge sont null/undefined (0 autorisé)
        return this.minAge == null && this.maxAge == null;
      },
      default: null,
    },
    description: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

const VaccineCalendar = model<IVaccineCalendar>(
  "VaccineCalendar",
  vaccineCalendarSchema
);

export default VaccineCalendar;
