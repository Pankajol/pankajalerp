import mongoose from "mongoose";

const LessonPlanSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    class: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    academicYear: { type: String, required: true },
    objectives: { type: String, trim: true },
    materials: { type: String, trim: true },
    procedure: { type: String, trim: true },
    assessment: { type: String, trim: true },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    // Syllabus status tracking
    syllabusStatus: {
      completed: { type: Boolean, default: false },
      completedDate: { type: Date },
      remarks: { type: String, trim: true },
    },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
  },
  { timestamps: true }
);

LessonPlanSchema.index({ companyId: 1, class: 1, subject: 1 });

export default mongoose.models.LessonPlan || mongoose.model("LessonPlan", LessonPlanSchema);