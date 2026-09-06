import mongoose from "mongoose";

const BusAssignmentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusRoute",
      required: true,
    },
    stop: {
      type: String,
      required: true, // should match one of the route's stops
    },
    pickupTime: String,
    dropTime: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Ensure one active assignment per student
BusAssignmentSchema.index({ student: 1, active: 1 }, { unique: true, partialFilterExpression: { active: true } });

export default mongoose.models.BusAssignment || mongoose.model("BusAssignment", BusAssignmentSchema);