import mongoose from "mongoose";

const PerformanceMetricSchema = new mongoose.Schema({
  metric: { type: String, required: true }, // "quality", "delivery", "shrinkage", "cost", "overall"
  score: { type: Number, min: 0, max: 100, default: 0 },
  weight: { type: Number, min: 0, max: 100, default: 20 },
  details: { type: String },
});

const SupplierPerformanceSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    // Quality metrics
    totalInspections: { type: Number, default: 0 },
    passedInspections: { type: Number, default: 0 },
    failedInspections: { type: Number, default: 0 },
    qualityScore: { type: Number, default: 0 },
    defectCount: { type: Number, default: 0 },
    defectTypes: { type: Map, of: Number },
    // Delivery metrics
    totalOrders: { type: Number, default: 0 },
    onTimeOrders: { type: Number, default: 0 },
    lateOrders: { type: Number, default: 0 },
    deliveryScore: { type: Number, default: 0 },
    avgLeadTime: { type: Number, default: 0 },
    // Job Work metrics
    totalSentQty: { type: Number, default: 0 },
    totalReceivedQty: { type: Number, default: 0 },
    avgShrinkage: { type: Number, default: 0 },
    shrinkageScore: { type: Number, default: 0 },
    // Cost metrics
    totalCost: { type: Number, default: 0 },
    avgUnitCost: { type: Number, default: 0 },
    costScore: { type: Number, default: 0 },
    // Overall
    overallScore: { type: Number, default: 0 },
    rating: { type: String, enum: ["A", "B", "C", "D", "F"], default: "B" },
    metrics: [PerformanceMetricSchema],
    status: { type: String, enum: ["draft", "approved"], default: "draft" },
    remarks: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

// Pre-save: calculate scores
SupplierPerformanceSchema.pre("save", function (next) {
  // Calculate quality score
  if (this.totalInspections > 0) {
    this.qualityScore = (this.passedInspections / this.totalInspections) * 100;
  }

  // Calculate delivery score
  if (this.totalOrders > 0) {
    this.deliveryScore = (this.onTimeOrders / this.totalOrders) * 100;
  }

  // Calculate shrinkage score (lower shrinkage = higher score)
  if (this.avgShrinkage > 0) {
    // 5% shrinkage = 80 score, 0% = 100, 10%+ = 0
    this.shrinkageScore = Math.max(0, 100 - (this.avgShrinkage * 10));
    if (this.shrinkageScore > 100) this.shrinkageScore = 100;
  }

  // Calculate cost score (relative - will be computed from avg costs)
  if (this.avgUnitCost > 0) {
    // Placeholder - will be calculated relative to other suppliers
    this.costScore = 80; // Default
  }

  // Overall score (weighted average)
  const weights = {
    quality: 35,
    delivery: 30,
    shrinkage: 20,
    cost: 15,
  };

  this.overallScore = (
    (this.qualityScore * weights.quality) +
    (this.deliveryScore * weights.delivery) +
    (this.shrinkageScore * weights.shrinkage) +
    (this.costScore * weights.cost)
  ) / 100;

  // Determine rating
  if (this.overallScore >= 90) this.rating = "A";
  else if (this.overallScore >= 75) this.rating = "B";
  else if (this.overallScore >= 60) this.rating = "C";
  else if (this.overallScore >= 40) this.rating = "D";
  else this.rating = "F";

  next();
});

export default mongoose.models.SupplierPerformance ||
  mongoose.model("SupplierPerformance", SupplierPerformanceSchema);