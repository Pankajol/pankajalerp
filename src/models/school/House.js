import mongoose from "mongoose";

const HouseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    color: { type: String, trim: true },
    motto: { type: String, trim: true },
    captain: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    viceCaptain: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
  },
  { timestamps: true }
);

HouseSchema.index({ companyId: 1, name: 1 }, { unique: true });

export default mongoose.models.House || mongoose.model("House", HouseSchema);