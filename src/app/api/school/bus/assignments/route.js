import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BusAssignment from "@/models/school/BusAssignment";
import BusRoute from "@/models/school/BusRoute";      // <-- ADD
import BusVehicle from "@/models/school/BusVehicle";  // <-- ADD
import Student from "@/models/school/Student";     
import { validateUser } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "GET");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const studentId = searchParams.get("student");
    const routeId = searchParams.get("route");
    const activeOnly = searchParams.get("active") !== "false";

    const query = { companyId: user.companyId };
    if (studentId) query.student = studentId;
    if (routeId) query.route = routeId;
    if (activeOnly) query.active = true;

    const total = await BusAssignment.countDocuments(query);
    const assignments = await BusAssignment.find(query)
      .populate("student", "firstName lastName studentId class")
      .populate("route", "name")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: assignments,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "POST");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    // If active assignment already exists for this student, deactivate it
    await BusAssignment.updateMany(
      { student: body.student, active: true },
      { active: false }
    );
    const assignment = await BusAssignment.create({ ...body, companyId: user.companyId });
    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}