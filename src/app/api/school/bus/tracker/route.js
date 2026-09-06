import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import BusTracker from "@/models/school/BusTracker";
import BusVehicle from "@/models/school/BusVehicle";
import { validateUser } from "@/lib/auth";

const TRACKER_STATUSES = ["on route", "at stop", "delayed", "inactive"];

function canUpdateTracker(user) {
  if (user?.type === "company") return true;
  const roles = [user?.schoolRole, ...(user?.roles || [])]
    .filter(Boolean)
    .map((role) => String(role).trim().toLowerCase());
  return roles.some((role) => ["admin", "school admin", "principal", "teacher"].includes(role));
}

function databaseUnavailable(err) {
  return err?.name === "MongoServerSelectionError" ||
    ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT"].includes(err?.code);
}

export async function GET(req) {
  try {
    await dbConnect();
    const { user, error, status } = await validateUser(req, "GET");
    if (error) return NextResponse.json({ success: false, message: error }, { status });
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicle");

    const query = { companyId: user.companyId };
    if (vehicleId) {
      if (!mongoose.isValidObjectId(vehicleId)) {
        return NextResponse.json({ success: false, message: "Invalid vehicle ID" }, { status: 400 });
      }
      query.vehicle = vehicleId;
    }

    const trackers = await BusTracker.find(query)
      .populate("vehicle", "busNumber driverName route")
      .lean();

    return NextResponse.json({ success: true, data: trackers });
  } catch (err) {
    console.error("GET /api/school/bus/tracker:", err);
    return NextResponse.json({
      success: false,
      message: databaseUnavailable(err) ? "Bus tracking is temporarily unavailable. Please retry in a moment." : "Unable to load bus locations",
    }, { status: databaseUnavailable(err) ? 503 : 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const { user, error, status } = await validateUser(req, "POST");
    if (error) return NextResponse.json({ success: false, message: error }, { status });
    if (!canUpdateTracker(user)) {
      return NextResponse.json({ success: false, message: "Only school staff can update bus locations" }, { status: 403 });
    }
    const body = await req.json();
    const { vehicleId, latitude, longitude, speed, status: busStatus, currentStopIndex, nextStop } = body;

    if (!vehicleId || latitude == null || longitude == null) {
      return NextResponse.json({ success: false, message: "Vehicle ID, latitude, longitude required" }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(vehicleId)) {
      return NextResponse.json({ success: false, message: "Invalid vehicle ID" }, { status: 400 });
    }
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    const parsedSpeed = Number(speed || 0);
    const parsedStopIndex = currentStopIndex === undefined ? -1 : Number(currentStopIndex);
    if (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90 ||
        !Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180 ||
        !Number.isFinite(parsedSpeed) || parsedSpeed < 0 ||
        !Number.isInteger(parsedStopIndex) || parsedStopIndex < -1) {
      return NextResponse.json({ success: false, message: "Invalid tracker location or progress values" }, { status: 400 });
    }
    if (busStatus && !TRACKER_STATUSES.includes(busStatus)) {
      return NextResponse.json({ success: false, message: "Invalid bus status" }, { status: 400 });
    }

    // Verify vehicle belongs to company
    const vehicle = await BusVehicle.findOne({ _id: vehicleId, companyId: user.companyId });
    if (!vehicle) {
      return NextResponse.json({ success: false, message: "Vehicle not found" }, { status: 404 });
    }

    // Update or create tracker
    const tracker = await BusTracker.findOneAndUpdate(
      { companyId: user.companyId, vehicle: vehicleId },
      {
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        speed: parsedSpeed,
        status: busStatus || "on route",
        currentStopIndex: parsedStopIndex,
        nextStop: String(nextStop || "").trim(),
        lastUpdate: new Date(),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).populate("vehicle", "busNumber driverName route");

    return NextResponse.json({ success: true, data: tracker });
  } catch (err) {
    console.error("POST /api/school/bus/tracker:", err);
    return NextResponse.json({
      success: false,
      message: databaseUnavailable(err) ? "Bus tracking is temporarily unavailable. Please retry in a moment." : "Unable to update bus location",
    }, { status: databaseUnavailable(err) ? 503 : 500 });
  }
}





// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import BusTracker from "@/models/school/BusTracker";
// import BusVehicle from "@/models/school/BusVehicle";
// import { validateUser } from "@/lib/auth";

// export async function GET(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req, "GET");
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { searchParams } = new URL(req.url);
//     const vehicleId = searchParams.get("vehicle");

//     const query = { companyId: user.companyId };
//     if (vehicleId) query.vehicle = vehicleId;

//     const trackers = await BusTracker.find(query)
//       .populate("vehicle", "busNumber driverName route")
//       .lean();

//     return NextResponse.json({ success: true, data: trackers });
//   } catch (err) {
//     return NextResponse.json({ success: false, message: err.message }, { status: 500 });
//   }
// }

// export async function POST(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req, "POST");
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const body = await req.json();
//     const { vehicleId, latitude, longitude, speed, status: busStatus, currentStopIndex, nextStop } = body;

//     if (!vehicleId || latitude == null || longitude == null) {
//       return NextResponse.json({ success: false, message: "Vehicle ID, latitude, longitude required" }, { status: 400 });
//     }

//     // Verify vehicle belongs to company
//     const vehicle = await BusVehicle.findOne({ _id: vehicleId, companyId: user.companyId });
//     if (!vehicle) {
//       return NextResponse.json({ success: false, message: "Vehicle not found" }, { status: 404 });
//     }

//     // Update or create tracker
//     const tracker = await BusTracker.findOneAndUpdate(
//       { companyId: user.companyId, vehicle: vehicleId },
//       {
//         latitude,
//         longitude,
//         speed: speed || 0,
//         status: busStatus || "on route",
//         currentStopIndex: currentStopIndex !== undefined ? currentStopIndex : -1,
//         nextStop: nextStop || "",
//         lastUpdate: new Date(),
//       },
//       { new: true, upsert: true, setDefaultsOnInsert: true }
//     ).populate("vehicle", "busNumber driverName route");

//     return NextResponse.json({ success: true, data: tracker });
//   } catch (err) {
//     return NextResponse.json({ success: false, message: err.message }, { status: 500 });
//   }
// }
