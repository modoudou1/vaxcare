import { Document, Schema, Types, model } from "mongoose";
import cron from "node-cron";

/* -------------------------------------------------------------------------- */
/* 🧩 Interface des vaccins faits                                            */
/* -------------------------------------------------------------------------- */
export interface IVaccineDone {
  name: string;
  date: Date;
}

/* -------------------------------------------------------------------------- */
/* 🩺 Interface des données médicales (EXPORTED)                             */
/* -------------------------------------------------------------------------- */
export interface IMedicalInfo {
  weight?: number; // en kg
  height?: number; // en cm
  bloodType?: string; // A+, B+, O+, AB+, etc.
  allergies?: string[];
  medicalNotes?: string;
  lastVisit?: Date;
}

/* -------------------------------------------------------------------------- */
/* 👨‍👩‍👧‍👦 Interface des informations parent étendues                              */
/* -------------------------------------------------------------------------- */
export interface IParentInfo {
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  parentPin?: string; // PIN hashé pour l'authentification mobile
}

/* -------------------------------------------------------------------------- */
/* 💉 Interface des vaccinations détaillées                                  */
/* -------------------------------------------------------------------------- */
export interface IVaccinationRecord {
  vaccineName: string;
  date: Date;
  status: "done" | "scheduled" | "overdue" | "planned";
  nextDue?: Date;
  ageAtVaccination?: string;
  healthCenter?: string;
  agent?: string;
  batchNumber?: string;
  notes?: string;
}

/* -------------------------------------------------------------------------- */
/* 👶 Interface principale de l'enfant                                      */
/* -------------------------------------------------------------------------- */
export interface IChild extends Document {
  // Informations de base
  firstName: string;
  lastName: string;
  birthDate: Date;
  gender: "M" | "F";
  
  // Informations parent
  parentInfo: IParentInfo;
  
  // Adresse et localisation
  address?: string;
  region?: string;
  healthCenter?: string;
  
  // Statut vaccinal
  status: "À jour" | "En retard" | "Non programmé" | "Pas à jour" | "À faire";
  nextAppointment?: Date | null;
  
  // Vaccinations
  vaccinesDue?: string[];
  vaccinesDone?: IVaccineDone[]; // Ancien format pour compatibilité
  vaccinationRecords?: IVaccinationRecord[]; // Nouveau format détaillé
  
  // Informations médicales
  medicalInfo?: IMedicalInfo;
  
  // Code d'accès parent (facile à retenir)
  parentAccessCode?: string; // Code à 6 chiffres pour l'authentification mobile
  
  // Métadonnées
  createdBy: Types.ObjectId;
  registrationDate?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Propriétés virtuelles et champs de compatibilité
  name?: string;
  parentName?: string; // Champ de compatibilité synchronisé avec parentInfo.parentName
  parentPhone?: string; // Champ de compatibilité synchronisé avec parentInfo.parentPhone
}

/* -------------------------------------------------------------------------- */
/* 📞 Helpers de normalisation téléphone (Sénégal)                           */
/* -------------------------------------------------------------------------- */
function normalizeSnPhone(input: string): string {
  if (!input) return input;
  const raw = String(input).trim();
  const only = raw.replace(/[^\d]/g, "");
  if (only.startsWith("00221")) return only.slice(5);
  if (!only.startsWith("221")) return "221" + only.slice(-9);
  return only;
}

/* -------------------------------------------------------------------------- */
/* 🔢 Validation Sénégal simple: 221 + 9 chiffres                            */
/* -------------------------------------------------------------------------- */
function isValidSnCanonical(d: string): boolean {
  return /^221\d{9}$/.test(d);
}

/* -------------------------------------------------------------------------- */
/* 🎲 Génération de code d'accès parent à 6 chiffres                         */
/* -------------------------------------------------------------------------- */
async function generateParentAccessCode(): Promise<string> {
  let code: string;
  let exists = true;
  
  while (exists) {
    // Générer un code à 6 chiffres (100000 à 999999)
    code = Math.floor(100000 + Math.random() * 900000).toString();
    // Vérifier l'unicité
    const existingChild = await Child.findOne({ parentAccessCode: code });
    exists = !!existingChild;
  }
  
  return code!;
}

/* -------------------------------------------------------------------------- */
/* 🧱 Définition du schéma Mongoose                                          */
/* -------------------------------------------------------------------------- */
const childSchema = new Schema<IChild>(
  {
    // Informations de base
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    birthDate: { type: Date, required: true },
    gender: { type: String, enum: ["M", "F"], required: true },

    // Informations parent (objet imbriqué)
    parentInfo: {
      parentName: { type: String, required: true, trim: true },
      parentPhone: {
        type: String,
        required: [true, "Téléphone du parent requis"],
        trim: true,
        set: (v: string) => (v ? normalizeSnPhone(v) : v),
        validate: {
          validator: (v: string) =>
            typeof v === "string" && isValidSnCanonical(v),
          message: "Numéro parent invalide — format attendu: 221XXXXXXXXX",
        },
      },
      parentEmail: { type: String, trim: true, lowercase: true },
      emergencyContact: { type: String, trim: true },
      emergencyPhone: { type: String, trim: true },
      parentPin: { type: String }, // PIN hashé pour l'authentification mobile
    },

    // Adresse et localisation
    address: { type: String, trim: true },
    region: { type: String, trim: true },
    healthCenter: { type: String, trim: true },

    // Statut vaccinal
    status: {
      type: String,
      enum: ["À jour", "En retard", "Non programmé", "Pas à jour", "À faire"],
      default: "Non programmé",
    },
    nextAppointment: { type: Date, default: null },

    // Vaccinations (ancien format pour compatibilité)
    vaccinesDue: [{ type: String }],
    vaccinesDone: [
      {
        name: { type: String, required: true, trim: true },
        date: { type: Date, required: true },
      },
    ],

    // Vaccinations (nouveau format détaillé)
    vaccinationRecords: [
      {
        vaccineName: { type: String, required: true, trim: true },
        date: { type: Date, required: true },
        status: { 
          type: String, 
          enum: ["done", "scheduled", "overdue", "planned"], 
          required: true 
        },
        nextDue: { type: Date },
        ageAtVaccination: { type: String, trim: true },
        healthCenter: { type: String, trim: true },
        agent: { type: String, trim: true },
        batchNumber: { type: String, trim: true },
        notes: { type: String, trim: true },
      },
    ],

    // Informations médicales (objet imbriqué)
    medicalInfo: {
      weight: { type: Number, min: 0, max: 200 }, // kg
      height: { type: Number, min: 0, max: 300 }, // cm
      bloodType: { 
        type: String, 
        enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Inconnu"],
        trim: true 
      },
      allergies: [{ type: String, trim: true }],
      medicalNotes: { type: String, trim: true },
      lastVisit: { type: Date },
    },

    // Code d'accès parent (facile à retenir)
    parentAccessCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    // Métadonnées
    registrationDate: { type: Date, default: Date.now },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // Champs de compatibilité (pour ne pas casser l'existant)
    name: { type: String }, // Sera calculé automatiquement
    parentName: { type: String }, // Sera synchronisé avec parentInfo.parentName
    parentPhone: { type: String }, // Sera synchronisé avec parentInfo.parentPhone
  },
  { timestamps: true }
);

/* -------------------------------------------------------------------------- */
/* ⚙️ Index utile pour recherche                                             */
/* -------------------------------------------------------------------------- */
childSchema.index({ region: 1, healthCenter: 1, name: 1 });

/* -------------------------------------------------------------------------- */
/* 🧮 Virtuals: propriétés calculées                                         */
/* -------------------------------------------------------------------------- */
childSchema.virtual("ageInMonths").get(function (this: IChild) {
  const now = new Date();
  const dob = new Date(this.birthDate);
  let months =
    (now.getFullYear() - dob.getFullYear()) * 12 +
    (now.getMonth() - dob.getMonth());
  if (now.getDate() < dob.getDate()) months -= 1;
  return Math.max(0, months);
});

// Virtual pour le nom complet
childSchema.virtual("fullName").get(function (this: IChild) {
  return `${this.firstName} ${this.lastName}`.trim();
});

/* -------------------------------------------------------------------------- */
/* 🧠 Pre-save: synchronisation des champs et mise à jour du statut          */
/* -------------------------------------------------------------------------- */
childSchema.pre<IChild>("save", async function (next) {
  // Génération du code d'accès parent si nouveau document
  if (this.isNew && !this.parentAccessCode) {
    this.parentAccessCode = await generateParentAccessCode();
  }
  
  // Synchronisation des champs de compatibilité
  if (this.firstName && this.lastName) {
    this.name = `${this.firstName} ${this.lastName}`.trim();
  }
  
  if (this.parentInfo?.parentName) {
    this.parentName = this.parentInfo.parentName;
  }
  
  if (this.parentInfo?.parentPhone) {
    this.parentPhone = this.parentInfo.parentPhone;
  }

  const now = new Date();

  if (!this.nextAppointment) {
    this.status = "Non programmé";
  } else {
    // Vérifie s’il existe un vaccin prévu non encore fait
    const hasMissed =
      Array.isArray(this.vaccinesDue) &&
      this.vaccinesDue.some((vaccineName: string) => {
        return !this.vaccinesDone?.some(
          (d: IVaccineDone) => d.name === vaccineName
        );
      });

    const diffMinutes =
      (this.nextAppointment.getTime() - now.getTime()) / 60000;

    if (Math.abs(diffMinutes) <= 30) {
      this.status = "À faire";
    } else if (hasMissed) {
      this.status = "Pas à jour";
    } else if (
      this.vaccinesDue &&
      this.vaccinesDone &&
      this.vaccinesDue.every((v: string) =>
        this.vaccinesDone!.some((d: IVaccineDone) => d.name === v)
      )
    ) {
      this.status = "À jour";
    } else if (this.nextAppointment > now && this.status !== "Pas à jour") {
      this.status = "À jour";
    }
  }

  next();
});

/* -------------------------------------------------------------------------- */
/* 🧩 Post-find : mise à jour dynamique du statut après lecture              */
/* -------------------------------------------------------------------------- */
function updateStatusAfterQuery(doc: IChild | null): void {
  if (!doc) return;
  const now = new Date();

  const hasMissed =
    Array.isArray(doc.vaccinesDue) &&
    doc.vaccinesDue.some((vaccineName: string) => {
      return !doc.vaccinesDone?.some(
        (d: IVaccineDone) => d.name === vaccineName
      );
    });

  const diffMinutes =
    (doc.nextAppointment?.getTime?.() ?? now.getTime()) - now.getTime();
  const diffMins = diffMinutes / 60000;

  if (!doc.nextAppointment) {
    doc.status = "Non programmé";
  } else if (Math.abs(diffMins) <= 30) {
    doc.status = "À faire";
  } else if (hasMissed) {
    doc.status = "Pas à jour";
  } else if (
    doc.vaccinesDue &&
    doc.vaccinesDone &&
    doc.vaccinesDue.every((v: string) =>
      doc.vaccinesDone!.some((d: IVaccineDone) => d.name === v)
    )
  ) {
    doc.status = "À jour";
  } else if (doc.nextAppointment > now && doc.status !== "Pas à jour") {
    doc.status = "À jour";
  }
}

childSchema.post("find", function (docs: IChild[]) {
  docs.forEach(updateStatusAfterQuery);
});

childSchema.post("findOne", function (doc: IChild | null) {
  updateStatusAfterQuery(doc);
});

/* -------------------------------------------------------------------------- */
/* 🕒 Cron: basculer automatiquement en "À faire" quand le RDV arrive        */
/* -------------------------------------------------------------------------- */
cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 15 * 60000);
    const windowEnd = new Date(now.getTime() + 15 * 60000);

    const Child = model<IChild>("Child", childSchema);
    const children = await Child.find({
      nextAppointment: { $gte: windowStart, $lte: windowEnd },
      status: { $ne: "À faire" },
    });

    for (const c of children) {
      c.status = "À faire";
      await c.save();
      console.log(`🟢 Enfant ${c.name} marqué "À faire" automatiquement`);
    }
  } catch (err) {
    console.error("Erreur tâche cron mise à jour 'À faire' :", err);
  }
});

/* -------------------------------------------------------------------------- */
/* 🚀 JSON options + Export du modèle                                        */
/* -------------------------------------------------------------------------- */
childSchema.set("toJSON", { virtuals: true });
childSchema.set("toObject", { virtuals: true });

const Child = model<IChild>("Child", childSchema);
export default Child;
