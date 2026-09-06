import mongoose from "mongoose";

const JobWorkReceiptSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    receiptNumber: { type: String, required: true },
    challan: { type: mongoose.Schema.Types.ObjectId, ref: "JobWorkChallan", required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    receivedDate: { type: Date, default: Date.now },
    fromWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
    toWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    vendorChallanNo: { type: String },
    vendorLotNo: { type: String },
    items: [
      {
        taka: { type: mongoose.Schema.Types.ObjectId, ref: "Taka" },
        finishedItem: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
        batch: { type: String },
        uom: { type: String, default: "Mtr" },
        challanQuantity: { type: Number, required: true, min: 0 },
        receivedQuantity: { type: Number, required: true, min: 0 },
        rejectedQuantity: { type: Number, min: 0, default: 0 },
        wastageQuantity: { type: Number, min: 0, default: 0 },
        shortQuantity: { type: Number, min: 0, default: 0 },
        actualMeters: { type: Number, min: 0 },
        lumpNo: { type: String },
        baseDocEntry: { type: String },
        notes: { type: String },
      },
    ],
    totalChallanQty: { type: Number, default: 0 },
    totalReceivedQty: { type: Number, default: 0 },
    commercialShrinkageMeter: { type: Number, default: 0 },
    commercialShrinkagePercent: { type: Number, default: 0 },
    processLoss: { type: Number, default: 0 },
    wastage: { type: Number, default: 0 },
    shortage: { type: Number, default: 0 },
    reason: { type: String },
    lotComplete: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "received", "qc"], default: "draft" },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Pre-save: calculate totals & shrinkage
JobWorkReceiptSchema.pre("save", function (next) {
  this.totalChallanQty = this.items.reduce((sum, i) => sum + (i.challanQuantity || 0), 0);
  this.totalReceivedQty = this.items.reduce((sum, i) => sum + (i.receivedQuantity || 0), 0);
  this.wastage = this.items.reduce((sum, i) => sum + (i.wastageQuantity || 0) + (i.rejectedQuantity || 0), 0);
  this.shortage = this.items.reduce((sum, i) => sum + (i.shortQuantity || 0), 0);
  this.processLoss = this.totalChallanQty - this.totalReceivedQty - this.wastage - this.shortage;
  this.commercialShrinkageMeter = this.totalChallanQty - this.totalReceivedQty;
  this.commercialShrinkagePercent = this.totalChallanQty
    ? (this.commercialShrinkageMeter / this.totalChallanQty) * 100
    : 0;
  next();
});

// Auto-generate receipt number
JobWorkReceiptSchema.pre("validate", async function (next) {
  if (!this.receiptNumber) {
    const latest = await mongoose.model("JobWorkReceipt")
      .findOne({ companyId: this.companyId, receiptNumber: /^JRC-\d+$/ })
      .sort({ receiptNumber: -1 })
      .select("receiptNumber")
      .lean();
    const nextNumber = Number(latest?.receiptNumber?.split("-").pop() || 0) + 1;
    this.receiptNumber = `JRC-${String(nextNumber).padStart(4, "0")}`;
  }
  next();
});

JobWorkReceiptSchema.index({ companyId: 1, receiptNumber: 1 }, { unique: true });

export default mongoose.models.JobWorkReceipt ||
  mongoose.model("JobWorkReceipt", JobWorkReceiptSchema);
