import mongoose from "mongoose";

const FeeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    feeHead: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paidDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "overdue", "partial"],
      default: "pending",
    },
    receiptNumber: {
      type: String,
      unique: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank", "online", "cheque"],
      default: "cash",
    },
    transactionId: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyUser",
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
  },
  { timestamps: true }
);

FeeSchema.index({ companyId: 1, student: 1 });
FeeSchema.index({ companyId: 1, status: 1 });
FeeSchema.index({ receiptNumber: 1 }, { unique: true, sparse: true });

export default mongoose.models.Fee || mongoose.model("Fee", FeeSchema);