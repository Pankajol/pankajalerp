import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BusVehicle from "@/models/school/BusVehicle";
import BusRoute from "@/models/school/BusRoute";
import { validateUser } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "GET");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const routeId = searchParams.get("route");
    const statusFilter = searchParams.get("status");

    const query = { companyId: user.companyId };
    if (search) query.busNumber = { $regex: search, $options: "i" };
    if (routeId) query.route = routeId;
    if (statusFilter) query.status = statusFilter;

    const total = await BusVehicle.countDocuments(query);
    const vehicles = await BusVehicle.find(query)
      .populate("route", "name description")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: vehicles,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Error in GET /api/school/bus/vehicles:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "POST");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    const vehicle = await BusVehicle.create({ ...body, companyId: user.companyId });
    return NextResponse.json({ success: true, data: vehicle }, { status: 201 });
  } catch (err) {
    console.error("Error in POST /api/school/bus/vehicles:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}