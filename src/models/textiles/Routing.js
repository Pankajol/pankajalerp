// models/textiles/Routing.js
import mongoose from "mongoose";

const StepSchema = new mongoose.Schema({
  sequence: { type: Number, required: true },
  operation: { type: String, required: true },
  machineType: { type: String },
  standardTime: { type: Number }, // in minutes or hours
  notes: { type: String },
});

const RoutingSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  machineType: { type: String },
  steps: [StepSchema],
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true });

export default mongoose.models.Routing || mongoose.model("Routing", RoutingSchema);