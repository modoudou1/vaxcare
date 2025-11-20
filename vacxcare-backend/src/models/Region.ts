import { Document, Schema, model } from "mongoose";

export interface IRegion extends Document {
  name: string; // ex: Dakar, Thiès, Saint-Louis
  active?: boolean;
}

const regionSchema = new Schema<IRegion>(
  {
    name: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model<IRegion>("Region", regionSchema);
