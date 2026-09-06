import mongoose from "mongoose";

const WeavingWIPSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: "ProductionOrder", required: true },
    machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine", required: true },
    operator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    shift: { type: String, enum: ["A", "B", "C", "General"], required: true },
    date: { type: Date, required: true, default: Date.now },
    plannedQuantity: { type: Number, required: true, min: 0 }, // planned meters per shift
    producedQuantity: { type: Number, required: true, min: 0 }, // actual meters produced
    waste: { type: Number, default: 0 }, // waste meters
    downtime: { type: Number, default: 0 }, // downtime in minutes
    efficiency: { type: Number, default: 0 }, // calculated as produced / planned * 100
    remarks: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["draft", "approved"], default: "draft" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

// Pre-save: calculate efficiency
WeavingWIPSchema.pre("save", function (next) {
  if (this.plannedQuantity > 0) {
    this.efficiency = (this.producedQuantity / this.plannedQuantity) * 100;
  } else {
    this.efficiency = 0;
  }
  next();
});

export default mongoose.models.WeavingWIP ||
  mongoose.model("WeavingWIP", WeavingWIPSchema);