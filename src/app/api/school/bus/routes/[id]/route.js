import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BusRoute from "@/models/school/BusRoute";
import { validateUser } from "@/lib/auth";

export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "GET");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const route = await BusRoute.findOne({ _id: id, companyId: user.companyId }).lean();
    if (!route) {
      return NextResponse.json({ success: false, message: "Route not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: route });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "PUT");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const body = await req.json();
    const route = await BusRoute.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      body,
      { new: true, runValidators: true }
    );
    if (!route) {
      return NextResponse.json({ success: false, message: "Route not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: route });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "DELETE");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const route = await BusRoute.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!route) {
      return NextResponse.json({ success: false, message: "Route not found" }, { status: 404 });
    }
    // Optionally also delete all vehicles and assignments linked to this route
    return NextResponse.json({ success: true, message: "Route deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}