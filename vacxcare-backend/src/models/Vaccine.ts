import { Document, Schema, model } from "mongoose";

export interface IVaccine extends Document {
  code?: string; // 🆔 code abrégé unique (ex: BCG01, POL)
  name: string; // Nom complet du vaccin (ex: "BCG", "Polio Oral", "Rougeole")
  description?: string;
  dosesRequired?: number; // Nombre de doses nécessaires
  createdAt: Date;
  updatedAt: Date;
}

const vaccineSchema = new Schema<IVaccine>(
  {
    code: {
      type: String,
      unique: true,
      sparse: true, // facultatif (tous les vaccins n’ont pas forcément de code)
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true, // ✅ tout est sauvegardé en majuscules pour cohérence
    },
    description: {
      type: String,
      trim: true,
    },
    dosesRequired: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { timestamps: true }
);

/* -------------------------------------------------------------------------- */
/* ⚙️ Indexes et middlewares utiles                                          */
/* -------------------------------------------------------------------------- */

// (indexes implicites via unique:true sur name/code)

// 🧠 Pré-enregistrement : uniformiser les noms et codes
vaccineSchema.pre("save", function (next) {
  if (this.name) this.name = this.name.trim().toUpperCase();
  if (this.code) this.code = this.code.trim().toUpperCase();
  next();
});

export default model<IVaccine>("Vaccine", vaccineSchema);