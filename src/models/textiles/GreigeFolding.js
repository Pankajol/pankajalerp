import mongoose from "mongoose";

const GreigeFoldingSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    foldingNumber: { type: String, required: true, unique: true },
    productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: "ProductionOrder", required: true },
    machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine" },
    lot: { type: mongoose.Schema.Types.ObjectId, ref: "Lot" },
    shift: { type: String, enum: ["A", "B", "C", "General"], required: true },
    date: { type: Date, default: Date.now },
    operator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Totals
    totalMeters: { type: Number, required: true, min: 0 },
    totalWeight: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    // Taka details: multiple rolls
    takas: [
      {
        takaNumber: { type: String, required: true },
        meters: { type: Number, required: true, min: 0 },
        weight: { type: Number, min: 0 },
        width: { type: Number, min: 0 },
        remarks: { type: String },
      },
    ],
    waste: { type: Number, default: 0 },
    remarks: { type: String },
    status: { type: String, enum: ["draft", "approved"], default: "draft" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-generate folding number
GreigeFoldingSchema.pre("save", async function (next) {
  if (!this.foldingNumber) {
    const count = await mongoose.model("GreigeFolding").countDocuments({ companyId: this.companyId });
    this.foldingNumber = `GF-${String(count + 1).padStart(4, "0")}`;
  }
  // Update total meters from takas if not provided
  if (this.takas && this.takas.length > 0) {
    const total = this.takas.reduce((sum, t) => sum + (t.meters || 0), 0);
    this.totalMeters = total;
  }
  next();
});

export default mongoose.models.GreigeFolding ||
  mongoose.model("GreigeFolding", GreigeFoldingSchema);