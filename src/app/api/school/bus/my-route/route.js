import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BusAssignment from "@/models/school/BusAssignment";
import { validateUser } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "GET");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    let studentId = searchParams.get("studentId");

    // If not provided, try to derive from user (student)
    const roles = (user.roles || []).map(r => r.toLowerCase());
    const isStudent = user.type === "student" || roles.includes("student");
    const isParent = user.type === "parent" || roles.includes("parent");

    if (!studentId && isStudent) {
      studentId = user.studentId || user.id;
    }
    if (!studentId && isParent) {
      // For parent, we might need to fetch children; but we'll return a message.
      return NextResponse.json({
        success: false,
        message: "Please provide a studentId parameter for parents",
      }, { status: 400 });
    }

    if (!studentId) {
      return NextResponse.json({ success: false, message: "Student ID required" }, { status: 400 });
    }

    // Find active assignment
    const assignment = await BusAssignment.findOne({
      companyId: user.companyId,
      student: studentId,
      active: true,
    })
      .populate("student", "firstName lastName studentId class")
      .populate("route", "name stops")
      .lean();

    if (!assignment) {
      return NextResponse.json({ success: false, message: "No active bus assignment found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: assignment });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}