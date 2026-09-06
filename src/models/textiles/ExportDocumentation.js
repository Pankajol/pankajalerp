import mongoose from "mongoose";

const ShippingMarkSchema = new mongoose.Schema({
  markNumber: { type: String },
  description: { type: String },
  cartons: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  volume: { type: Number, default: 0 },
});

const ExportDocumentationSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    exportNumber: { type: String, required: true, unique: true },
    salesOrder: { type: mongoose.Schema.Types.ObjectId, ref: "SalesOrder" },
    productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: "ProductionOrder" },
    takas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Taka" }],
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    customerReference: { type: String },
    // Shipping Details
    shippedDate: { type: Date },
    shippingMethod: { type: String, enum: ["air", "sea", "road", "express"], default: "sea" },
    shippingCompany: { type: String },
    billOfLading: { type: String },
    vesselName: { type: String },
    voyageNumber: { type: String },
    portOfLoading: { type: String },
    portOfDischarge: { type: String },
    containerNumber: { type: String },
    sealNumber: { type: String },
    // Packing Details
    totalCartons: { type: Number, default: 0 },
    totalWeight: { type: Number, default: 0 }, // kg
    totalVolume: { type: Number, default: 0 }, // cbm
    shippingMarks: [ShippingMarkSchema],
    // Invoice Details
    invoiceNumber: { type: String },
    invoiceDate: { type: Date },
    invoiceValue: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    incoterms: { type: String, enum: ["FOB", "CIF", "EXW", "DDP"], default: "FOB" },
    paymentTerms: { type: String },
    // Commercial Invoice Items
    invoiceItems: [
      {
        taka: { type: mongoose.Schema.Types.ObjectId, ref: "Taka" },
        description: { type: String },
        quantity: { type: Number },
        unit: { type: String },
        unitPrice: { type: Number },
        totalPrice: { type: Number },
      },
    ],
    // Status
    status: {
      type: String,
      enum: ["draft", "approved", "shipped", "delivered", "cancelled"],
      default: "draft",
    },
    // Documents
    documents: [
      {
        type: { type: String, enum: ["commercial-invoice", "packing-list", "bill-of-lading", "certificate", "other"] },
        name: { type: String },
        url: { type: String },
        uploadedAt: { type: Date },
      },
    ],
    remarks: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-generate export number
ExportDocumentationSchema.pre("save", async function (next) {
  if (!this.exportNumber) {
    const count = await mongoose.model("ExportDocumentation").countDocuments({ company: this.company });
    this.exportNumber = `EXP-${String(count + 1).padStart(4, "0")}`;
  }
  // Calculate totals from shipping marks if not set
  if (this.shippingMarks && this.shippingMarks.length > 0) {
    this.totalCartons = this.shippingMarks.reduce((sum, m) => sum + (m.cartons || 0), 0);
    this.totalWeight = this.shippingMarks.reduce((sum, m) => sum + (m.weight || 0), 0);
    this.totalVolume = this.shippingMarks.reduce((sum, m) => sum + (m.volume || 0), 0);
  }
  next();
});

export default mongoose.models.ExportDocumentation ||
  mongoose.model("ExportDocumentation", ExportDocumentationSchema);