import mongoose from "mongoose";

const BusVehicleSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    busNumber: {
      type: String,
      required: true,
      unique: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    driverName: {
      type: String,
      required: true,
    },
    driverContact: String,
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusRoute",
    },
    status: {
      type: String,
      enum: ["active", "maintenance", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.models.BusVehicle || mongoose.model("BusVehicle", BusVehicleSchema);