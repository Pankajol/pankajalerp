import mongoose from "mongoose";

// This model is for storing aggregated analytics (optional)
// We'll mostly compute on-the-fly from QCInspection data

const DefectAnalyticsSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    defectType: { type: String, required: true },
    count: { type: Number, default: 0 },
    totalAffectedMtrs: { type: Number, default: 0 },
    severityBreakdown: {
      minor: { type: Number, default: 0 },
      major: { type: Number, default: 0 },
      critical: { type: Number, default: 0 },
    },
    machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine" },
    operator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    takaCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.DefectAnalytics ||
  mongoose.model("DefectAnalytics", DefectAnalyticsSchema);