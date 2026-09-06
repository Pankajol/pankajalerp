import mongoose from "mongoose";

const QuestionBankSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    class: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    questions: [
      {
        question: { type: String, required: true },
        options: [String],
        correctAnswer: { type: Number }, // index of correct option
        marks: { type: Number, default: 0 },
        type: {
          type: String,
          enum: ["mcq", "true-false", "short-answer", "long-answer"],
          default: "mcq",
        },
      },
    ],
    tags: [String],
    isActive: { type: Boolean, default: true },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyUser",
      required: true,
    },
  },
  { timestamps: true }
);

QuestionBankSchema.index({ companyId: 1, class: 1, subject: 1 });

export default mongoose.models.QuestionBank ||
  mongoose.model("QuestionBank", QuestionBankSchema);