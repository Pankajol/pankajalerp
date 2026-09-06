// models/textiles/TextileBOM.js
import mongoose from "mongoose";

const TextileBOMSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    bomCode: { type: String, required: true, unique: true },
    design: { type: mongoose.Schema.Types.ObjectId, ref: "Design", index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    bomType: { type: String, enum: ["knitting", "dyeing", "printing", "finishing", "general"], default: "general" },
    shade: { type: mongoose.Schema.Types.ObjectId, ref: "Shade" }, // ref to ShadeCard
    wastePercent: { type: Number, default: 0 },
    batchNo: { type: String },
    components: [
      {
        item: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        wasteFactor: { type: Number, default: 0 },
        notes: { type: String },
        warehouse: { type: String },
        batchRequired: { type: Boolean, default: false },
        scrapPercent: { type: Number, default: 0, min: 0 },
      },
    ],
    operations: [{
      operation: { type: String, required: true },
      workstation: { type: String },
      machine: { type: String },
      timeMinutes: { type: Number, min: 0, default: 0 },
      hourlyRate: { type: Number, min: 0, default: 0 },
    }],
    status: { type: String, enum: ["draft", "active", "archived"], default: "draft" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.models.TextileBOM || mongoose.model("TextileBOM", TextileBOMSchema);
