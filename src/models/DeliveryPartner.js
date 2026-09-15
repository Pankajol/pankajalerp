import mongoose from "mongoose";

const DeliveryPartnerSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  pinHash: { type: String, required: true, select: false },
  vehicleNumber: { type: String, trim: true, default: "" },
  active: { type: Boolean, default: true },
  lastSeenAt: { type: Date },
}, { timestamps: true });

DeliveryPartnerSchema.index({ companyId: 1, phone: 1 }, { unique: true });

export default mongoose.models.DeliveryPartner || mongoose.model("DeliveryPartner", DeliveryPartnerSchema);
