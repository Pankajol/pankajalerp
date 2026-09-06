import mongoose from "mongoose";

const CircularSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    targetGroups: {
      type: [String],
      enum: ["all", "teachers", "students", "parents", "primary", "secondary", "all-teachers", "all-students", "all-parents"],
      default: ["all"],
    },
    attachments: [{ name: String, url: String }],
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
  },
  { timestamps: true }
);

CircularSchema.index({ companyId: 1, isActive: 1 });

export default mongoose.models.Circular || mongoose.model("Circular", CircularSchema);