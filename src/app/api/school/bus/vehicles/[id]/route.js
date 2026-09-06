import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BusVehicle from "@/models/school/BusVehicle";
import { validateUser } from "@/lib/auth";

export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "GET");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const vehicle = await BusVehicle.findOne({ _id: id, companyId: user.companyId })
      .populate("route", "name")
      .lean();
    if (!vehicle) {
      return NextResponse.json({ success: false, message: "Vehicle not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: vehicle });
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
    const vehicle = await BusVehicle.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      body,
      { new: true, runValidators: true }
    );
    if (!vehicle) {
      return NextResponse.json({ success: false, message: "Vehicle not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: vehicle });
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
    const vehicle = await BusVehicle.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!vehicle) {
      return NextResponse.json({ success: false, message: "Vehicle not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Vehicle deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}