import mongoose from "mongoose";

const PurchaseInvoicePaymentSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseInvoice", required: true, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  paymentDate: { type: Date, default: Date.now, required: true },
  paymentMethod: { type: String, enum: ["Cash", "Bank Transfer", "Cheque", "UPI"], default: "Bank Transfer" },
  referenceNo: { type: String, trim: true },
  remarks: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

PurchaseInvoicePaymentSchema.index({ companyId: 1, invoiceId: 1, paymentDate: -1 });

export default mongoose.models.PurchaseInvoicePayment ||
  mongoose.model("PurchaseInvoicePayment", PurchaseInvoicePaymentSchema);
