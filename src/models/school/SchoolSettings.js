import mongoose from "mongoose";

const SchoolSettingsSchema = new mongoose.Schema(
  {
    schoolName: { type: String, required: true, trim: true },
    schoolAddress: { type: String, trim: true },
    schoolPhone: { type: String, trim: true },
    schoolEmail: { type: String, trim: true },
    academicYear: { type: String, required: true },
    attendancePoints: {
      present: { type: Number, default: 2 },
      halfDay: { type: Number, default: 1 },
      leave: { type: Number, default: 0 },
      absent: { type: Number, default: -1 },
    },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, unique: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
  },
  { timestamps: true }
);

export default mongoose.models.SchoolSettings || mongoose.model("SchoolSettings", SchoolSettingsSchema);