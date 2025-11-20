import mongoose, { Document, Schema } from "mongoose";

export interface IVaccineSchedule extends Document {
  minAge?: number; // âge minimal (optionnel pour les tranches)
  maxAge?: number | null; // âge maximal (optionnel pour les tranches)
  specificAge?: number | null; // âge spécifique (uniquement pour les âges spécifiques)
  unit: "weeks" | "months" | "years"; // unité de temps (semaines, mois, années)
  vaccines: string[]; // liste des vaccins
  description?: string; // description facultative
  createdBy?: mongoose.Types.ObjectId; // ID de l'utilisateur créateur
  createdAt: Date;
  updatedAt: Date;
}

const VaccineScheduleSchema = new Schema<IVaccineSchedule>(
  {
    minAge: {
      type: Number,
      required: function () {
        return !this.specificAge; // minAge requis uniquement si specificAge est null
      },
    },
    maxAge: {
      type: Number,
      default: null,
      required: function () {
        return !this.specificAge; // maxAge requis uniquement si specificAge est null
      },
    },
    specificAge: {
      type: Number,
      required: function () {
        return !this.minAge; // specificAge requis si minAge est null
      },
      default: null,
    },
    unit: {
      type: String,
      enum: ["weeks", "months", "years"],
      required: true,
    },
    vaccines: {
      type: [String],
      required: true,
      validate: {
        validator: (arr: string[]) =>
          Array.isArray(arr) &&
          new Set(arr.map((v) => v.toLowerCase())).size === arr.length,
        message: "Les vaccins doivent être uniques dans chaque tranche d’âge",
      },
    },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model<IVaccineSchedule>(
  "VaccineSchedule",
  VaccineScheduleSchema
);
