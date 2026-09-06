import mongoose from "mongoose";

const TrainingAttendanceSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: "TrainingSession", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true },
    status: { type: String, enum: ["present", "absent", "late"], default: "present" },
    remarks: { type: String },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true }
);

export default mongoose.models.TrainingAttendance || mongoose.model("TrainingAttendance", TrainingAttendanceSchema);