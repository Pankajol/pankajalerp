// models/textiles/Lot.js
import mongoose from "mongoose";

const LotSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  lotNumber: { type: String, required: true, unique: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
  shade: { type: mongoose.Schema.Types.ObjectId, ref: "ShadeCard" },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
  purchaseOrder: { type: String },
  receivedDate: { type: Date },
  qualityGrade: { type: String },
  notes: { type: String },
  status: { type: String, enum: ["in-stock", "used", "damaged"], default: "in-stock" },
}, { timestamps: true });

export default mongoose.models.Lot || mongoose.model("Lot", LotSchema);