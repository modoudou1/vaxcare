import { Document, Schema, model, Types } from "mongoose";

export interface IStock extends Document {
  vaccine: string; // Nom du vaccin (ex: BCG, POLIO)
  batchNumber: string; // Numéro du lot
  quantity: number; // Quantité restante
  initialQuantity?: number; // Quantité initiale au moment de la création
  expirationDate: Date; // Date d’expiration du lot
  
  // Hiérarchie de possession
  level: "national" | "regional" | "district" | "agent"; // Niveau actuel de possession
  region?: string; // Si level >= regional
  healthCenter?: Types.ObjectId; // Référence vers HealthCenter si level >= district
  assignedTo?: Types.ObjectId; // Pour stocks individuels (agent → membre d'équipe)
  
  createdBy: Types.ObjectId; // Référence à l’utilisateur (agent)

  // Champs calculés
  lowStock?: boolean; // vrai si quantité < 10
  expiringSoon?: boolean; // vrai si expiration dans 30 jours
  expired?: boolean; // vrai si déjà expiré
  createdAt: Date;
  updatedAt: Date;
}

const stockSchema = new Schema<IStock>(
  {
    vaccine: {
      type: String,
      required: true,
      trim: true,
      uppercase: true, // cohérent avec le modèle Vaccine
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    initialQuantity: {
      type: Number,
      default: 0,
    },
    expirationDate: {
      type: Date,
      required: true,
    },
    level: {
      type: String,
      enum: ["national", "regional", "district", "agent"],
      required: true,
      default: "national",
    },
    region: {
      type: String,
      trim: true,
    },
    healthCenter: {
      type: Schema.Types.ObjectId,
      ref: "HealthCenter",
      required: false,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

/* -------------------------------------------------------------------------- */
/* 🧮 Virtuels calculés automatiquement                                     */
/* -------------------------------------------------------------------------- */
stockSchema.virtual("expired").get(function (this: IStock) {
  const now = new Date();
  return this.expirationDate < now;
});

stockSchema.virtual("expiringSoon").get(function (this: IStock) {
  const now = new Date();
  const daysLeft =
    (this.expirationDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
  return daysLeft <= 30 && daysLeft > 0; // ⏰ Expire dans 30 jours ou moins
});

stockSchema.virtual("lowStock").get(function (this: IStock) {
  return this.quantity < 10; // ⚠️ Seuil critique
});

/* -------------------------------------------------------------------------- */
/* ⚙️ Middleware : cohérence et normalisation                                */
/* -------------------------------------------------------------------------- */
stockSchema.pre("save", function (next) {
  if (this.vaccine) this.vaccine = this.vaccine.trim().toUpperCase();
  if (this.batchNumber) this.batchNumber = this.batchNumber.trim().toUpperCase();

  if (!this.initialQuantity || this.initialQuantity === 0) {
    this.initialQuantity = this.quantity;
  }

  next();
});

/* -------------------------------------------------------------------------- */
/* 🔍 Indexes pour les recherches rapides                                    */
/* -------------------------------------------------------------------------- */
stockSchema.index({ vaccine: 1 });
stockSchema.index({ region: 1 });
stockSchema.index({ healthCenter: 1 });
stockSchema.index({ expirationDate: 1 });

/* -------------------------------------------------------------------------- */
/* 🧾 Activation des virtuals dans les réponses JSON                         */
/* -------------------------------------------------------------------------- */
stockSchema.set("toJSON", { virtuals: true });
stockSchema.set("toObject", { virtuals: true });

export default model<IStock>("Stock", stockSchema);