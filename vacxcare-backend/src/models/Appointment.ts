import mongoose, { Document, Schema } from "mongoose";

/* -------------------------------------------------------------------------- */
/* 🧬 Interface TypeScript                                                   */
/* -------------------------------------------------------------------------- */
export interface IAppointment extends Document {
  child: mongoose.Types.ObjectId; // Enfant concerné
  vaccine: mongoose.Types.ObjectId; // Vaccin associé
  healthCenter: mongoose.Types.ObjectId; // Référence vers HealthCenter
  region?: string;
  district?: string;
  agent?: mongoose.Types.ObjectId; // Agent qui crée/valide
  requestedBy?: mongoose.Types.ObjectId; // Parent (optionnel)
  date: Date; // Date prévue
  status: "planned" | "done" | "missed" | "pending" | "confirmed" | "refused";
  notes?: string;
}

/* -------------------------------------------------------------------------- */
/* 🧱 Schéma Mongoose                                                        */
/* -------------------------------------------------------------------------- */
const AppointmentSchema = new Schema<IAppointment>(
  {
    child: { type: Schema.Types.ObjectId, ref: "Child", required: true },
    vaccine: { type: Schema.Types.ObjectId, ref: "Vaccine", required: true },
    healthCenter: { 
      type: Schema.Types.ObjectId, 
      ref: "HealthCenter", 
      required: true 
    },
    region: { type: String, trim: true },
    district: { type: String, trim: true },
    agent: { type: Schema.Types.ObjectId, ref: "User" },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["planned", "done", "missed", "pending", "confirmed", "refused"],
      default: "pending",
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

/* -------------------------------------------------------------------------- */
/* ⚙️ Index utiles                                                           */
/* -------------------------------------------------------------------------- */
AppointmentSchema.index({ healthCenter: 1 });
AppointmentSchema.index({ region: 1 });
AppointmentSchema.index({ date: 1 });

export default mongoose.model<IAppointment>("Appointment", AppointmentSchema);
