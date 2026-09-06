import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BusTracker from "@/models/school/BusTracker";
import { validateUser } from "@/lib/auth";

export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "GET");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const tracker = await BusTracker.findOne({ _id: id, companyId: user.companyId })
      .populate("vehicle", "busNumber driverName route")
      .lean();
    if (!tracker) {
      return NextResponse.json({ success: false, message: "Tracker not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: tracker });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}