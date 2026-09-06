import mongoose from "mongoose";

// Immutable audit trail used by orders, job cards, QC and material movements.
const ProductionEventSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  entityType: { type: String, enum: ["ProductionOrder", "JobCard", "ProductionJobCard", "Material", "Quality"], required: true, index: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  action: { type: String, required: true, trim: true },
  fromStatus: { type: String, default: null },
  toStatus: { type: String, default: null },
  note: { type: String, trim: true, maxlength: 1000, default: "" },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
}, { timestamps: true });

ProductionEventSchema.index({ companyId: 1, entityType: 1, entityId: 1, createdAt: -1 });
export default mongoose.models.ProductionEvent || mongoose.model("ProductionEvent", ProductionEventSchema);
