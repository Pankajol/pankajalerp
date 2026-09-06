import mongoose from "mongoose";

const TrainingEnrollmentSchema = new mongoose.Schema(
  {
    program: { type: mongoose.Schema.Types.ObjectId, ref: "TrainingProgram", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true }, // staff member
    enrollmentDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["enrolled", "completed", "dropped"], default: "enrolled" },
    certificateIssued: { type: Boolean, default: false },
    certificateUrl: { type: String },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true }
);

export default mongoose.models.TrainingEnrollment || mongoose.model("TrainingEnrollment", TrainingEnrollmentSchema);