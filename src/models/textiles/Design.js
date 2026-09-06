import mongoose from "mongoose";

export const DesignSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    designCode: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, required: true, trim: true },
    fabric: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      default: null,
    },
    category: { type: String, trim: true, default: "" },
    weaveType: { type: String, trim: true, default: "" },
    repeatSize: {
      width: { type: Number, min: 0, default: 0 },
      height: { type: Number, min: 0, default: 0 },
      unit: { type: String, trim: true, default: "cm" },
    },
    colors: [{ type: String, trim: true }],
    imageUrl: { type: String, trim: true, default: "" },
    qualityParameters: [
      { type: mongoose.Schema.Types.ObjectId, ref: "QualityParameter" },
    ],
    notes: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "archived"],
      default: "active",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

DesignSchema.index({ companyId: 1, designCode: 1 }, { unique: true });
DesignSchema.index({ companyId: 1, status: 1, description: 1 });

export default mongoose.models.Design || mongoose.model("Design", DesignSchema);
