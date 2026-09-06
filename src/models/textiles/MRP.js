import mongoose from "mongoose";

const MRPItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
  requiredQty: { type: Number, required: true, min: 0 },
  availableStock: { type: Number, default: 0 },
  safetyStock: { type: Number, default: 0 },
  pendingPurchase: { type: Number, default: 0 }, // quantities already ordered
  netRequirement: { type: Number, default: 0 }, // requiredQty - availableStock - pendingPurchase + safetyStock
  suggestedOrderQty: { type: Number, default: 0 },
  unit: { type: String },
  sourceOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProductionOrder" }],
  remarks: { type: String },
});

const MRPSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    runNumber: { type: String, required: true, unique: true },
    runDate: { type: Date, default: Date.now },
    horizonStart: { type: Date, required: true },
    horizonEnd: { type: Date, required: true },
    items: [MRPItemSchema],
    totalItems: { type: Number, default: 0 },
    totalNetRequirement: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "review", "approved"], default: "draft" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    remarks: { type: String },
  },
  { timestamps: true }
);

// Auto-generate run number
MRPSchema.pre("save", async function (next) {
  if (!this.runNumber) {
    const count = await mongoose.model("MRP").countDocuments({ companyId: this.companyId });
    this.runNumber = `MRP-${String(count + 1).padStart(4, "0")}`;
  }
  this.totalItems = this.items?.length || 0;
  this.totalNetRequirement = this.items?.reduce((sum, i) => sum + (i.netRequirement || 0), 0) || 0;
  next();
});

export default mongoose.models.MRP || mongoose.model("MRP", MRPSchema);
