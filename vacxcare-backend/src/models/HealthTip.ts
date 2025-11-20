import mongoose, { Document, Schema } from 'mongoose';

export interface IHealthTip extends Document {
  title: string;
  description: string;
  category: 'vaccination' | 'nutrition' | 'hygiene' | 'development' | 'safety' | 'general';
  media?: {
    type: 'image' | 'video' | 'pdf';
    url: string;
    filename: string;
  };
  targetAgeGroup?: string; // Ex: "0-6 mois", "6-12 mois", "1-2 ans", "Tous"
  priority: 'high' | 'medium' | 'low';
  isActive: boolean;
  views: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HealthTipSchema = new Schema<IHealthTip>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['vaccination', 'nutrition', 'hygiene', 'development', 'safety', 'general'],
      default: 'general',
    },
    media: {
      type: {
        type: String,
        enum: ['image', 'video', 'pdf'],
      },
      url: String,
      filename: String,
    },
    targetAgeGroup: {
      type: String,
      default: 'Tous',
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index pour améliorer les performances
HealthTipSchema.index({ category: 1, isActive: 1 });
HealthTipSchema.index({ createdAt: -1 });
HealthTipSchema.index({ priority: -1, createdAt: -1 });

export default mongoose.model<IHealthTip>('HealthTip', HealthTipSchema);
