import mongoose from "mongoose";

const DefectSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "hole",
      "stain",
      "slub",
      "oil-mark",
      "missing-yarn",
      "broken-yarn",
      "shade-variation",
      "crease",
      "crease-mark",
      "weft-bow",
      "selvedge-defect",
      "other",
    ],
    required: true,
  },
  position: { type: String }, // e.g., "left", "center", "right", "edge"
  severity: { type: String, enum: ["minor", "major", "critical"], default: "minor" },
  quantity: { type: Number, default: 0 }, // affected meters
  defect: { type: String },
  points: { type: Number, default: 0, min: 0 },
  remarks: { type: String },
});

const QCInspectionSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    taka: { type: mongoose.Schema.Types.ObjectId, ref: "Taka", required: true },
    design: { type: mongoose.Schema.Types.ObjectId, ref: "Design", index: true },
    inspectionNumber: { type: String, required: true, unique: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
    batch: { type: String },
    inspectedDate: { type: Date, default: Date.now },
    inspector: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    gsm: { type: Number, min: 0 },
    scoringBasis: { type: String, enum: ["per-area", "per-length"], default: "per-length" },
    scoringDivisor: { type: Number, min: 0, default: 100 },
    totalPoints: { type: Number, default: 0 },
    inspectionScore: { type: Number, default: 0 },
    parameters: [
      {
        parameter: { type: mongoose.Schema.Types.ObjectId, ref: "QualityParameter" },
        actualValue: { type: Number },
        result: { type: String, enum: ["pass", "fail"] },
        remarks: { type: String },
      },
    ],
    defects: [DefectSchema],
    grade: { type: String, enum: ["A", "A-", "B", "C", "D", "Reject"] },
    finalResult: { type: String, enum: ["pending", "pass", "fail", "hold", "rework"], default: "pending" },
    remarks: { type: String },
    status: { type: String, enum: ["draft", "pending", "approved", "rejected", "hold", "rework"], default: "draft" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-generate inspection number
QCInspectionSchema.pre("validate", async function (next) {
  this.totalPoints = (this.defects || []).reduce((sum, defect) => sum + Number(defect.points || 0), 0);
  const basis = this.scoringBasis === "per-area" ? Number(this.length || 0) * Number(this.width || 0) : Number(this.length || 0);
  this.inspectionScore = basis > 0 ? (this.totalPoints * Number(this.scoringDivisor || 100)) / basis : 0;
  if (!this.inspectionNumber) {
    const count = await mongoose.model("QCInspection").countDocuments({ companyId: this.companyId });
    this.inspectionNumber = `QCI-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

export default mongoose.models.QCInspection ||
  mongoose.model("QCInspection", QCInspectionSchema);
