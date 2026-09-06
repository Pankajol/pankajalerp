// models/textiles/QualityParameter.js
import mongoose from "mongoose";

const QualityParameterSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  method: { type: String },
  minValue: { type: Number },
  maxValue: { type: Number },
  unit: { type: String },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true });

export default mongoose.models.QualityParameter || mongoose.model("QualityParameter", QualityParameterSchema);