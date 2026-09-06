import mongoose from "mongoose";

const TextileDocumentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    doctype: { type: String, required: true, index: true },
    documentNumber: { type: String, required: true },
    status: { type: String, default: "Draft", index: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    actionLog: [
      {
        action: String,
        previousStatus: String,
        nextStatus: String,
        userId: String,
        at: { type: Date, default: Date.now },
        createdDocument: { type: mongoose.Schema.Types.ObjectId, ref: "TextileDocument" },
      },
    ],
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true, minimize: false }
);

TextileDocumentSchema.index({ companyId: 1, doctype: 1, documentNumber: 1 }, { unique: true });

export default mongoose.models.TextileDocument ||
  mongoose.model("TextileDocument", TextileDocumentSchema);

