import mongoose from "mongoose";

const TrainingSessionSchema = new mongoose.Schema(
  {
    program: { type: mongoose.Schema.Types.ObjectId, ref: "TrainingProgram", required: true },
    title: { type: String, required: true },
    date: { type: Date, required: true },
    startTime: { type: String }, // e.g., "09:00"
    endTime: { type: String },
    venue: { type: String },
    facilitator: { type: String },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true }
);

export default mongoose.models.TrainingSession || mongoose.model("TrainingSession", TrainingSessionSchema);