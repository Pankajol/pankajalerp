import mongoose from "mongoose";

const LiveClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    class: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // "09:00" format
    endTime: { type: String, required: true },
    meetingLink: { type: String, trim: true },
    platform: { type: String, enum: ["zoom", "google-meet", "microsoft-teams", "other"], default: "zoom" },
    recordingLink: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
  },
  { timestamps: true }
);

LiveClassSchema.index({ companyId: 1, date: 1 });
LiveClassSchema.index({ companyId: 1, class: 1 });
LiveClassSchema.index({ companyId: 1, teacher: 1 });

export default mongoose.models.LiveClass || mongoose.model("LiveClass", LiveClassSchema);