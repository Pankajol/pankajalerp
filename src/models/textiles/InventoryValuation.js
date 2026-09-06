import mongoose from "mongoose";

const InventoryItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
  batch: { type: String }, // batch/lot number
  purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  unitCost: { type: Number, required: true, min: 0 },
  totalCost: { type: Number, required: true, min: 0 },
  receivedDate: { type: Date, default: Date.now },
  expiryDate: { type: Date },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
  location: { type: String },
  status: { type: String, enum: ["in-stock", "allocated", "damaged"], default: "in-stock" },
});

const InventoryValuationSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    valuationNumber: { type: String, required: true, unique: true },
    valuationDate: { type: Date, default: Date.now },
    method: { type: String, enum: ["fifo", "lifo", "weighted-average"], required: true },
    items: [InventoryItemSchema],
    // Aggregated totals
    totalQuantity: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    totalItems: { type: Number, default: 0 },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
    status: { type: String, enum: ["draft", "approved", "archived"], default: "draft" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    remarks: { type: String },
  },
  { timestamps: true }
);

// Pre-save: calculate totals
InventoryValuationSchema.pre("save", function (next) {
  if (this.items && this.items.length > 0) {
    this.totalQuantity = this.items.reduce((sum, i) => sum + i.quantity, 0);
    this.totalValue = this.items.reduce((sum, i) => sum + i.totalCost, 0);
    this.totalItems = this.items.length;
  }
  next();
});

// Auto-generate valuation number
InventoryValuationSchema.pre("save", async function (next) {
  if (!this.valuationNumber) {
    const count = await mongoose.model("InventoryValuation").countDocuments({ companyId: this.companyId });
    this.valuationNumber = `INV-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

export default mongoose.models.InventoryValuation ||
  mongoose.model("InventoryValuation", InventoryValuationSchema);