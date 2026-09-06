import mongoose from "mongoose";

const BusTrackerSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusVehicle",
      required: true,
      // Vehicle ObjectIds are globally unique; the route additionally scopes
      // every update by companyId.
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    speed: {
      type: Number,
      default: 0, // km/h
    },
    status: {
      type: String,
      enum: ["on route", "at stop", "delayed", "inactive"],
      default: "inactive",
    },
    lastUpdate: {
      type: Date,
      default: Date.now,
    },
    // Optional: current stop index (to show progress)
    currentStopIndex: {
      type: Number,
      default: -1,
    },
    // Optional: next stop name
    nextStop: String,
  },
  { timestamps: true }
);

// Update lastUpdate on save
BusTrackerSchema.pre("save", function (next) {
  this.lastUpdate = new Date();
  next();
});

BusTrackerSchema.index({ companyId: 1, vehicle: 1 }, { unique: true });

export default mongoose.models.BusTracker || mongoose.model("BusTracker", BusTrackerSchema);
