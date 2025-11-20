import { Document, model, Schema, Types } from "mongoose";
import bcrypt from "bcrypt";

export type UserRole = "user" | "agent" | "district" | "regional" | "national";

// ⚠️ AgentLevel conservé pour compatibilité avec facility_admin/staff
// District est maintenant un rôle à part entière
export type AgentLevel = "facility_admin" | "facility_staff";

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password?: string;
  role: UserRole;
  region?: string;
  healthCenter?: Types.ObjectId; // Référence vers HealthCenter
  agentLevel?: AgentLevel;
  firstName?: string;
  lastName?: string;
  phone?: string;
  active?: boolean;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  permissions: {
    dashboard: boolean;
    enfants: boolean;
    rendezvous: boolean;
    campagnes: boolean;
    vaccins: boolean;
    rapports: boolean;
    agents: boolean;
    stocks: boolean;
    parametres: boolean;
  };

  // ⭐ champ dérivé
  phoneNormalized?: string | null;
  // 🔐 2FA
  twoFactorEnabled?: boolean;
  twoFactorMethod?: "email" | "sms";
  twoFactorCode?: string | null;
  twoFactorExpires?: Date | null;
  
  // 🔐 Méthodes
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, default: null },
    role: {
      type: String,
      enum: ["user", "agent", "district", "regional", "national"],
      default: "user",
    },
    region: { type: String },
    healthCenter: { 
      type: Schema.Types.ObjectId, 
      ref: "HealthCenter",
      required: false 
    },
    agentLevel: {
      type: String,
      enum: ["facility_admin", "facility_staff"],
      default: undefined,
    },
    firstName: { type: String },
    lastName: { type: String },
    phone: { type: String },
    active: { type: Boolean, default: true },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },

    permissions: {
      dashboard: { type: Boolean, default: true },
      enfants: { type: Boolean, default: true },
      rendezvous: { type: Boolean, default: true },
      campagnes: { type: Boolean, default: true },
      vaccins: { type: Boolean, default: true },
      rapports: { type: Boolean, default: true },
      agents: { type: Boolean, default: false },
      stocks: { type: Boolean, default: true },
      parametres: { type: Boolean, default: false },
    },

    // ⭐ dérivé pour recherches robustes
    phoneNormalized: { type: String, default: null },
    // 🔐 2FA
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorMethod: { type: String, enum: ["email", "sms"], default: "email" },
    twoFactorCode: { type: String, default: null },
    twoFactorExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

// ⭐ Hook de normalisation simple (chiffres uniquement)
userSchema.pre("save", async function (next) {
  // Normalisation du téléphone
  if (this.phone) {
    const digits = String(this.phone).replace(/\D+/g, "");
    this.phoneNormalized = digits || null;
  } else {
    this.phoneNormalized = null;
  }

  // 🔐 Hashage du mot de passe si modifié
  if (this.isModified("password") && this.password) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error as Error);
    }
  }
  
  next();
});

// 🔐 Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Index utiles
userSchema.index({ phone: 1 });
userSchema.index({ phoneNormalized: 1 });

userSchema.set("toJSON", {
  transform: (_doc, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

const User = model<IUser>("User", userSchema);
export default User;