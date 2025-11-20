import mongoose, { Schema, Document } from "mongoose";

export interface IApiKey extends Document {
  name: string;
  key: string;
  permissions: string[];
  active: boolean;
  createdBy?: string;
  expiresAt?: Date;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    permissions: [{ type: String }],
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    expiresAt: { type: Date },
    lastUsed: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IApiKey>("ApiKey", ApiKeySchema);
