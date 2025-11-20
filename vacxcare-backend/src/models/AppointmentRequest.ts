import mongoose, { Document, Schema } from "mongoose";

/* -------------------------------------------------------------------------- */
/* 🧬 Interface TypeScript - Demande de Rendez-vous                         */
/* -------------------------------------------------------------------------- */
export interface IAppointmentRequest extends Document {
  child: mongoose.Types.ObjectId; // Enfant concerné
  vaccine: string; // Nom du vaccin (ex: "BCG", "POLIO")
  parentPhone: string; // Téléphone du parent (pour notification)
  
  // Centre de santé ciblé
  healthCenter: string; // Nom du centre choisi
  region: string; // Région du centre
  district?: string; // District du centre (optionnel)
  
  // Demande
  requestedDate: Date; // Date souhaitée par le parent
  requestMessage?: string; // Message optionnel du parent
  
  // Réponse de l'agent
  status: "pending" | "accepted" | "rejected";
  responseDate?: Date; // Date de réponse de l'agent
  responseMessage?: string; // Motif de refus ou message d'acceptation
  respondedBy?: mongoose.Types.ObjectId; // Agent qui a répondu
  
  // Rendez-vous créé si accepté
  appointmentCreated?: mongoose.Types.ObjectId; // ID du RDV créé
  
  // Metadata
  urgencyLevel: "normal" | "urgent"; // Normal ou urgent (vaccin très en retard)
  stockVerified: boolean; // Stock vérifié au moment de la demande
  availableDoses: number; // Nombre de doses disponibles au moment de la demande
}

/* -------------------------------------------------------------------------- */
/* 🧱 Schéma Mongoose                                                        */
/* -------------------------------------------------------------------------- */
const AppointmentRequestSchema = new Schema<IAppointmentRequest>(
  {
    child: { type: Schema.Types.ObjectId, ref: "Child", required: true },
    vaccine: { 
      type: String, 
      required: true, 
      trim: true,
      uppercase: true 
    },
    parentPhone: { 
      type: String, 
      required: true, 
      trim: true 
    },
    
    // Centre ciblé
    healthCenter: { type: String, required: true, trim: true },
    region: { type: String, required: true, trim: true },
    district: { type: String, trim: true },
    
    // Demande
    requestedDate: { type: Date, required: true },
    requestMessage: { type: String, trim: true },
    
    // Réponse
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    responseDate: { type: Date },
    responseMessage: { type: String, trim: true },
    respondedBy: { type: Schema.Types.ObjectId, ref: "User" },
    
    // Rendez-vous créé
    appointmentCreated: { type: Schema.Types.ObjectId, ref: "Appointment" },
    
    // Metadata
    urgencyLevel: {
      type: String,
      enum: ["normal", "urgent"],
      default: "normal",
    },
    stockVerified: { type: Boolean, default: false },
    availableDoses: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* -------------------------------------------------------------------------- */
/* ⚙️ Index pour optimiser les recherches                                    */
/* -------------------------------------------------------------------------- */
AppointmentRequestSchema.index({ healthCenter: 1, status: 1 });
AppointmentRequestSchema.index({ child: 1 });
AppointmentRequestSchema.index({ status: 1, createdAt: -1 });
AppointmentRequestSchema.index({ parentPhone: 1 });

export default mongoose.model<IAppointmentRequest>("AppointmentRequest", AppointmentRequestSchema);
