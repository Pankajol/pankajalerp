import mongoose from "mongoose";

const BusRouteSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    stops: [
      {
        stopName: { type: String, required: true },
        time: { type: String }, // e.g. "07:30 AM"
        order: { type: Number, default: 0 },
      },
    ],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.BusRoute || mongoose.model("BusRoute", BusRouteSchema);