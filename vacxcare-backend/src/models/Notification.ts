import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  title: string;
  message: string;
  type: "campagne" | "vaccination" | "stock" | "conseil" | "systeme";
  targetRoles: string[]; // ["parent", "agent", "district", "regional", "national", "admin", "all"]
  targetUsers?: mongoose.Types.ObjectId[];
  readBy: mongoose.Types.ObjectId[];
  icon?: string;
  status?: "info" | "warning" | "danger" | "success";
  createdAt: Date;
  updatedAt?: Date;

  // ⭐ Soft delete par utilisateur (conservé)
  deletedBy?: mongoose.Types.ObjectId[];

  // ⭐ Ajouts pour fallback de persistance côté parent
  parentPhone?: string;                 // téléphone normalisé (variante acceptée)
  child?: mongoose.Types.ObjectId;      // lien facultatif vers l’enfant
  
  // ⭐ Métadonnées pour ciblage spécifique
  metadata?: {
    childId?: string;                   // ID de l'enfant pour ciblage précis
    [key: string]: any;                 // Autres métadonnées flexibles
  };
}

const notificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    type: {
      type: String,
      enum: ["campagne", "vaccination", "stock", "conseil", "systeme"],
      default: "systeme",
    },

    // 👇 permet d’envoyer à des groupes de rôles
    targetRoles: {
      type: [String],
      enum: ["parent", "agent", "district", "regional", "national", "admin", "all"],
      default: ["all"],
    },

    // 👇 permet d’envoyer à des utilisateurs précis (optionnel)
    targetUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // 👇 liste des utilisateurs ayant lu la notif
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],

    icon: { type: String, default: "🔔" },

    status: {
      type: String,
      enum: ["info", "warning", "danger", "success"],
      default: "info",
    },

    // ⭐ Soft delete par utilisateur (conservé)
    deletedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // ⭐ Fallback par téléphone / enfant
    parentPhone: { type: String, index: true },
    child: { type: Schema.Types.ObjectId, ref: "Child", index: true },
    
    // ⭐ Métadonnées pour ciblage spécifique
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
      index: true
    },
  },
  {
    timestamps: true, // crée automatiquement createdAt & updatedAt
  }
);

// ✅ Indexes utiles
notificationSchema.index({ targetRoles: 1, createdAt: -1 });
notificationSchema.index({ targetUsers: 1, createdAt: -1 });
notificationSchema.index({ readBy: 1 });
notificationSchema.index({ deletedBy: 1 });
notificationSchema.index({ "metadata.childId": 1, createdAt: -1 }); // ⭐ Index pour ciblage par enfant
// ⭐ déjà posé au champ : parentPhone & child ont chacun index:true

export default mongoose.model<INotification>("Notification", notificationSchema);