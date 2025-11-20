import { Document, Schema, model, Types } from "mongoose";

export interface IStockTransfer extends Document {
  stock: Types.ObjectId; // Référence au stock transféré
  vaccine: string; // Nom du vaccin
  batchNumber: string; // Numéro du lot
  quantity: number; // Quantité transférée
  
  // Hiérarchie de transfert
  fromLevel: "national" | "regional" | "district" | "agent";
  toLevel: "national" | "regional" | "district" | "agent";
  
  // Source du transfert
  fromRegion?: string;
  fromHealthCenter?: string;
  fromUser: Types.ObjectId; // Qui a initié le transfert
  
  // Destination du transfert
  toRegion?: string;
  toHealthCenter?: string;
  toUser?: Types.ObjectId; // Utilisateur destinataire (optionnel)
  
  // Statut et dates
  status: "pending" | "accepted" | "rejected" | "cancelled";
  transferDate: Date;
  acceptedDate?: Date;
  rejectedDate?: Date;
  notes?: string; // Raison de rejet ou notes
  
  createdAt: Date;
  updatedAt: Date;
}

const stockTransferSchema = new Schema<IStockTransfer>(
  {
    stock: {
      type: Schema.Types.ObjectId,
      ref: "Stock",
      required: true,
    },
    vaccine: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
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
      min: 1,
    },
    fromLevel: {
      type: String,
      enum: ["national", "regional", "district", "agent"],
      required: true,
    },
    toLevel: {
      type: String,
      enum: ["national", "regional", "district", "agent"],
      required: true,
    },
    fromRegion: {
      type: String,
      trim: true,
    },
    fromHealthCenter: {
      type: String,
      trim: true,
    },
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toRegion: {
      type: String,
      trim: true,
    },
    toHealthCenter: {
      type: String,
      trim: true,
    },
    toUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },
    transferDate: {
      type: Date,
      default: Date.now,
    },
    acceptedDate: {
      type: Date,
    },
    rejectedDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

/* -------------------------------------------------------------------------- */
/* 🔍 Indexes pour les recherches rapides                                    */
/* -------------------------------------------------------------------------- */
stockTransferSchema.index({ stock: 1 });
stockTransferSchema.index({ fromUser: 1 });
stockTransferSchema.index({ toUser: 1 });
stockTransferSchema.index({ status: 1 });
stockTransferSchema.index({ toRegion: 1, toHealthCenter: 1 });

export default model<IStockTransfer>("StockTransfer", stockTransferSchema);
