// models/textiles/ShadeCard.js
import mongoose from "mongoose";

const ShadeCardSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  hexCode: { type: String, default: "#cccccc" },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true });

export default mongoose.models.ShadeCard || mongoose.model("ShadeCard", ShadeCardSchema);