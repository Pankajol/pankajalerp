import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Timesheet from "@/models/hr/Timesheet";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const canReview = (user) => user?.type === "company" || user?.roles?.some((role) => ["Admin", "HR Manager"].includes(role));

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!canReview(user)) return NextResponse.json({ success: false, message: "Only HR reviewers can view all timesheets" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const query = { companyId: user.companyId };
    if (searchParams.get("status")) query.status = searchParams.get("status");
    const entries = await Timesheet.find(query).populate("employeeId", "fullName employeeCode").sort({ date: -1, createdAt: -1 });
    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    console.error("GET /api/hr/timesheets error:", error);
    return NextResponse.json({ success: false, message: "Unable to load timesheets" }, { status: 500 });
  }
}
