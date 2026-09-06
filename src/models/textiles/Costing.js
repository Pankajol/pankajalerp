import mongoose from "mongoose";

const CostBreakdownSchema = new mongoose.Schema({
  category: { type: String, required: true }, // "material", "labor", "overhead", "jobwork", "waste"
  description: { type: String },
  amount: { type: Number, default: 0 },
  rate: { type: Number },
  quantity: { type: Number },
  unit: { type: String },
  source: { type: String }, // reference to source document
  item: { type: String }, employeeOrSkill: { type: String }, machine: { type: String },
  jobWorker: { type: String }, process: { type: String }, utility: { type: String },
  costCenter: { type: String }, allocationBasis: { type: String }, recoveryValue: { type: Number, default: 0 },
});

const CostingSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    taka: { type: mongoose.Schema.Types.ObjectId, ref: "Taka" },
    productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: "ProductionOrder" },
    design: { type: mongoose.Schema.Types.ObjectId, ref: "Design", index: true },
    costingNumber: { type: String, required: true, unique: true },
    periodStart: { type: Date },
    periodEnd: { type: Date },
    costBreakdown: [CostBreakdownSchema],
    totalCost: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0, min: 0 },
    marginAmount: { type: Number, default: 0 },
    marginPercentage: { type: Number, default: 0 },
    costPerMeter: { type: Number, default: 0 },
    costPerKg: { type: Number, default: 0 },
    materialCost: { type: Number, default: 0 },
    laborCost: { type: Number, default: 0 },
    overheadCost: { type: Number, default: 0 },
    jobWorkCost: { type: Number, default: 0 },
    wasteCost: { type: Number, default: 0 },
    machineCost: { type: Number, default: 0 },
    utilityCost: { type: Number, default: 0 },
    byProductRecovery: { type: Number, default: 0 },
    totalQty: { type: Number, default: 0 },
    unit: { type: String, default: "Mtr" },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["draft", "approved"], default: "draft" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    remarks: { type: String },
  },
  { timestamps: true }
);

// Pre-save: calculate totals
CostingSchema.pre("save", function (next) {
  if (this.costBreakdown && this.costBreakdown.length > 0) {
    let material = 0,
      labor = 0,
      overhead = 0,
      jobwork = 0,
      waste = 0;
    let machine = 0, utility = 0, recovery = 0;

    for (const item of this.costBreakdown) {
      const amount = item.amount || 0;
      switch (item.category) {
        case "material":
          material += amount;
          break;
        case "labor":
          labor += amount;
          break;
        case "overhead":
          overhead += amount;
          break;
        case "jobwork":
          jobwork += amount;
          break;
        case "waste":
          waste += amount;
          break;
        case "machine": machine += amount; break;
        case "utility": utility += amount; break;
        case "by-product": recovery += item.recoveryValue || amount; break;
        default:
          break;
      }
    }

    this.materialCost = material;
    this.laborCost = labor;
    this.overheadCost = overhead;
    this.jobWorkCost = jobwork;
    this.wasteCost = waste;
    this.machineCost = machine;
    this.utilityCost = utility;
    this.byProductRecovery = recovery;
    this.totalCost = material + labor + machine + jobwork + utility + overhead + waste - recovery;

    if (this.totalQty > 0) {
      this.costPerMeter = this.totalCost / this.totalQty;
      this.costPerKg = this.totalCost / (this.totalQty || 1);
    }
  }
  this.marginAmount = (this.sellingPrice || 0) - this.totalCost;
  this.marginPercentage = this.sellingPrice > 0
    ? (this.marginAmount / this.sellingPrice) * 100
    : 0;
  next();
});

// Auto-generate costing number
CostingSchema.pre("validate", async function (next) {
  if (!this.costingNumber) {
    const count = await mongoose.model("Costing").countDocuments({ companyId: this.companyId });
    this.costingNumber = `CST-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

export default mongoose.models.Costing ||
  mongoose.model("Costing", CostingSchema);
