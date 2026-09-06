import mongoose from "mongoose";

const TimesheetSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    date: { type: Date, required: true, index: true },
    // Optional link for project-costing/reporting; project remains a readable snapshot.
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    project: { type: String, required: true, trim: true, maxlength: 120 },
    task: { type: String, required: true, trim: true, maxlength: 160 },
    hours: { type: Number, required: true, min: 0.25, max: 24 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending", index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true }
);

TimesheetSchema.index({ companyId: 1, employeeId: 1, date: -1 });

export default mongoose.models.Timesheet || mongoose.model("Timesheet", TimesheetSchema);
