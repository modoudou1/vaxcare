import mongoose, { Document, Schema } from 'mongoose';

export interface IVaccinationDays extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userRole: 'district' | 'agent';
  healthCenter: string;
  region?: string;
  vaccinationDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  timeSlots: {
    morning: {
      enabled: boolean;
      startTime: string; // Format HH:MM
      endTime: string;   // Format HH:MM
    };
    afternoon: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
  };
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VaccinationDaysSchema: Schema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // unique: true sera défini via l'index ci-dessous
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ['district', 'agent'],
    required: true
  },
  healthCenter: {
    type: String,
    required: true
  },
  region: {
    type: String,
    required: function(this: IVaccinationDays) {
      return this.userRole === 'district';
    }
  },
  vaccinationDays: {
    monday: { type: Boolean, default: false },
    tuesday: { type: Boolean, default: false },
    wednesday: { type: Boolean, default: false },
    thursday: { type: Boolean, default: false },
    friday: { type: Boolean, default: false },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false }
  },
  timeSlots: {
    morning: {
      enabled: { type: Boolean, default: true },
      startTime: { type: String, default: '08:00' },
      endTime: { type: String, default: '12:00' }
    },
    afternoon: {
      enabled: { type: Boolean, default: true },
      startTime: { type: String, default: '14:00' },
      endTime: { type: String, default: '17:00' }
    }
  },
  notes: {
    type: String,
    maxlength: 500
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
VaccinationDaysSchema.index({ userId: 1 }, { unique: true }); // Un seul planning par utilisateur
VaccinationDaysSchema.index({ healthCenter: 1 });
VaccinationDaysSchema.index({ region: 1, userRole: 1 });

export default mongoose.model<IVaccinationDays>('VaccinationDays', VaccinationDaysSchema);
