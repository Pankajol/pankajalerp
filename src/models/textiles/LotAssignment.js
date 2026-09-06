import mongoose from "mongoose";

const LotAssignmentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: "ProductionOrder", required: true },
    lot: { type: mongoose.Schema.Types.ObjectId, ref: "Lot", required: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    assignedQuantity: { type: Number, required: true, min: 0 },
    availableQuantity: { type: Number, required: true }, // after assignment
    status: { type: String, enum: ["pending", "assigned", "used"], default: "pending" },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.LotAssignment || mongoose.model("LotAssignment", LotAssignmentSchema);