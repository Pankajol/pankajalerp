import mongoose from "mongoose";

const TrainingProgramSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, enum: ["pedagogy", "subject", "leadership", "technology", "other"] },
    duration: { type: Number, default: 0 }, // in hours
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
  },
  { timestamps: true }
);

export default mongoose.models.TrainingProgram || mongoose.model("TrainingProgram", TrainingProgramSchema);