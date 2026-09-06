import mongoose from "mongoose";

const ExamSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    class: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    date: { type: Date, required: true },
    duration: { type: Number, required: true, min: 0 }, // in minutes
    totalMarks: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["online", "offline"], default: "offline" },
    instructions: { type: String, trim: true },
    randomizeQuestions: { type: Boolean, default: false },
    allowNavigation: { type: Boolean, default: true },
    showResults: { type: Boolean, default: false },
    questions: [
      {
        question: { type: String, required: true },
        options: [String],
        correctAnswer: { type: Number }, // index of correct option
        marks: { type: Number, default: 0 },
        type: { type: String, enum: ["mcq", "true-false", "short-answer", "long-answer"], default: "mcq" },
      },
    ],
    status: { type: String, enum: ["draft", "published", "completed"], default: "draft" },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
  },
  { timestamps: true }
);

ExamSchema.index({ companyId: 1, class: 1, status: 1 });

export default mongoose.models.Exam || mongoose.model("Exam", ExamSchema);
