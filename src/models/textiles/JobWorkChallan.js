import mongoose from "mongoose";

const JobWorkChallanSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    challanNumber: { type: String, required: true },
    request: { type: mongoose.Schema.Types.ObjectId, ref: "JobWorkRequest", required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    process: { type: String, required: true },
    fromWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
    toWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" }, // vendor warehouse
    vendorChallanNo: { type: String },
    issuedDate: { type: Date, default: Date.now },
    expectedReturnDate: { type: Date },
    transport: { type: String },
    vehicleNo: { type: String },
    driverName: { type: String },
    notes: { type: String },
    items: [
      {
        taka: { type: mongoose.Schema.Types.ObjectId, ref: "Taka" },
        item: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
        batch: { type: String },
        uom: { type: String, default: "Mtr" },
        rate: { type: Number, min: 0, default: 0 },
        amount: { type: Number, min: 0, default: 0 },
        quantity: { type: Number, required: true, min: 0.01 },
        actualMeters: { type: Number, min: 0 },
        jobWorkMeters: { type: Number, min: 0 },
        weight: { type: Number, min: 0 },
        notes: { type: String },
      },
    ],
    totalQuantity: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "issued", "partial", "completed"],
      default: "draft",
    },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    issuedAt: { type: Date },
  },
  { timestamps: true }
);

// Pre-save: calculate total quantity
JobWorkChallanSchema.pre("save", function (next) {
  this.items.forEach((item) => { item.amount = Number(item.quantity || 0) * Number(item.rate || 0); });
  this.totalQuantity = this.items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  next();
});

// Auto-generate challan number
JobWorkChallanSchema.pre("validate", async function (next) {
  if (!this.challanNumber) {
    const latest = await mongoose.model("JobWorkChallan")
      .findOne({ companyId: this.companyId, challanNumber: /^JWC-\d+$/ })
      .sort({ challanNumber: -1 })
      .select("challanNumber")
      .lean();
    const nextNumber = Number(latest?.challanNumber?.split("-").pop() || 0) + 1;
    this.challanNumber = `JWC-${String(nextNumber).padStart(4, "0")}`;
  }
  next();
});

JobWorkChallanSchema.index({ companyId: 1, challanNumber: 1 }, { unique: true });

export default mongoose.models.JobWorkChallan ||
  mongoose.model("JobWorkChallan", JobWorkChallanSchema);
