import mongoose from "mongoose";

const HomeworkSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    class: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    dueDate: { type: Date, required: true },
    attachments: [{ name: String, url: String }],
    submissions: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
        submittedDate: { type: Date, default: Date.now },
        content: String,
        remarks: String,
        score: { type: Number, min: 0 },
        feedback: String,
        gradedDate: Date,
        gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
        files: [{ name: String, url: String }],
      },
    ],
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
  },
  { timestamps: true }
);

HomeworkSchema.index({ companyId: 1, class: 1, dueDate: 1 });

export default mongoose.models.Homework || mongoose.model("Homework", HomeworkSchema);
