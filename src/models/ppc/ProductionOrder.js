import mongoose from "mongoose";

const ProductionOrderSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
    },
    itemCode: { type: String, required: true, trim: true },
    itemName: { type: String, required: true, trim: true },
    design: { type: mongoose.Schema.Types.ObjectId, ref: "Design", index: true },
    quantity: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["Draft", "Pending", "Released", "In Progress", "On Hold", "Completed", "Cancelled"],
      default: "Pending",
    },
    assignedMachine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Machine",
      default: null,
    },
    assignedOperator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Operator",
      default: null,
    },
    assignedResource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyUser",
    },
  },
  { timestamps: true }
);

ProductionOrderSchema.index({ companyId: 1, orderNumber: 1 }, { unique: true });

// This is intentionally a separate model/collection from the legacy
// `models/ProductionOrder` sales-to-production document.
export default mongoose.models.PPCProductionOrder ||
  mongoose.model("PPCProductionOrder", ProductionOrderSchema, "ppcproductionorders");
