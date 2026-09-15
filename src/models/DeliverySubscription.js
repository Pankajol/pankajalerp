import mongoose from "mongoose";

const DeliverySubscriptionSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    variantId: { type: String, default: "" },
    quantity: { type: Number, min: 1, max: 99, default: 1 },
    frequency: { type: String, enum: ["daily", "alternate", "custom"], default: "daily" },
    weekdays: [{ type: Number, min: 0, max: 6 }],
    timeSlot: { type: String, enum: ["6-8 AM", "8-10 AM", "5-7 PM"], default: "6-8 AM" },
    addressIndex: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ["active", "paused", "cancelled"], default: "active", index: true },
    startDate: { type: Date, default: Date.now },
    priceSnapshot: { type: Number, min: 0, required: true },
    skipDates: [{ type: String, match: /^\d{4}-\d{2}-\d{2}$/ }],
    pausedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true }
);

DeliverySubscriptionSchema.index(
  { companyId: 1, customerId: 1, productId: 1, variantId: 1 },
  { unique: true }
);
DeliverySubscriptionSchema.index({ companyId: 1, status: 1, createdAt: -1 });

export default mongoose.models.DeliverySubscription ||
  mongoose.model("DeliverySubscription", DeliverySubscriptionSchema);
