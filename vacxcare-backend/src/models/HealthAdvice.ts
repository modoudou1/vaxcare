import { Document, Schema, model } from "mongoose";

export interface IHealthAdvice extends Document {
  title: string;
  videoUrl: string;
  description: string;
}

const healthAdviceSchema = new Schema<IHealthAdvice>(
  {
    title: { type: String, required: true },
    videoUrl: { type: String, required: true },
    description: { type: String, required: true },
  },
  { timestamps: true }
);

export default model<IHealthAdvice>("HealthAdvice", healthAdviceSchema);
