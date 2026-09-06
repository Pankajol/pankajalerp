import mongoose from "mongoose";

const JobWorkRequestSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    requestNumber: { type: String, required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    process: { type: String, required: true }, // Dyeing, Printing, Finishing, etc.
    sourceWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
    targetWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
    issueDate: { type: Date },
    expectedReturnDate: { type: Date },
    materials: [{ item: { type: mongoose.Schema.Types.ObjectId, ref: "Item" }, batch: String, qty: Number, uom: String, rate: Number, amount: Number }],
    takas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Taka" }], // multiple takas
    design: { type: mongoose.Schema.Types.ObjectId, ref: "Design", index: true },
    // Snapshots keep old documents/reports readable if master text changes.
    designCode: { type: String },
    designDescription: { type: String },
    customerCode: { type: String },
    customerName: { type: String },
    deliveryDesign: { type: String },
    deliveryDate: { type: Date },
    notes: { type: String },
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "in-progress", "cancelled", "completed"],
      default: "draft",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
  },
  { timestamps: true }
);

// Auto-generate request number
JobWorkRequestSchema.pre("validate", async function (next) {
  if (!this.requestNumber) {
    const latest = await mongoose.model("JobWorkRequest")
      .findOne({ companyId: this.companyId, requestNumber: /^JWR-\d+$/ })
      .sort({ requestNumber: -1 })
      .select("requestNumber")
      .lean();
    const nextNumber = Number(latest?.requestNumber?.split("-").pop() || 0) + 1;
    this.requestNumber = `JWR-${String(nextNumber).padStart(4, "0")}`;
  }
  next();
});

JobWorkRequestSchema.index({ companyId: 1, requestNumber: 1 }, { unique: true });

export default mongoose.models.JobWorkRequest ||
  mongoose.model("JobWorkRequest", JobWorkRequestSchema);
