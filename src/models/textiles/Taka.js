import mongoose from "mongoose";
// Register referenced models before any taka route calls populate().
import "@/models/ProductionOrder";
import "@/models/textiles/Lot";
import "@/models/ItemModels";
import "@/models/textiles/ShadeCard";
import "@/models/warehouseModels";

const TakaSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    takaNumber: { type: String, required: true, unique: true },
    productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: "ProductionOrder", required: true },
    lot: { type: mongoose.Schema.Types.ObjectId, ref: "Lot" },
    fabric: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true }, // finished fabric
    design: { type: String },
    designRef: { type: mongoose.Schema.Types.ObjectId, ref: "Design", index: true },
    shade: { type: mongoose.Schema.Types.ObjectId, ref: "ShadeCard" },
    fabricSpecification: { type: String },
    color: { type: String },
    gsm: { type: Number, min: 0 },
    length: { type: Number, min: 0 },
    quantity: { type: Number, required: true }, // meters
    weight: { type: Number }, // kg
    width: { type: Number }, // inches/cm
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
    location: { type: String }, // rack/bin
    rack: { type: String },
    qualityGrade: { type: String, enum: ["", "A", "A-", "B", "C", "Reject"], default: "" },
    status: {
      type: String,
      enum: ["created", "in-production", "available", "reserved", "partially-sold", "sold", "job-work", "received", "qc", "finished", "rejected", "hold", "returned", "dispatched"],
      default: "created",
    },
    qrCode: { type: String }, // base64 image string or URL
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

TakaSchema.pre("save", function (next) {
  this.length = this.length ?? this.quantity;
  this.quantity = this.quantity ?? this.length;
  this.rack = this.rack || this.location;
  this.location = this.location || this.rack;
  next();
});

export default mongoose.models.Taka || mongoose.model("Taka", TakaSchema);
