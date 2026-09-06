import mongoose from "mongoose";

const SchoolAttendanceSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ["staff", "student"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "onModel",
      required: true,
    },
    onModel: {
      type: String,
      enum: ["Student", "Staff"],
      required: true,
    },
    status: {
      type: String,
      enum: ["present", "absent", "half-day", "leave"],
      required: true,
    },
    checkIn: {
      type: Date,
    },
    checkOut: {
      type: Date,
    },
    remarks: {
      type: String,
      trim: true,
    },
    points: {
      type: Number,
      default: 0,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyUser",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
  },
  { timestamps: true }
);

SchoolAttendanceSchema.index({ companyId: 1, date: 1, type: 1 });
SchoolAttendanceSchema.index({ companyId: 1, entityId: 1, date: 1 }, { unique: true });
SchoolAttendanceSchema.index({ companyId: 1, type: 1, status: 1 });

export default mongoose.models.SchoolAttendance || mongoose.model("SchoolAttendance", SchoolAttendanceSchema);