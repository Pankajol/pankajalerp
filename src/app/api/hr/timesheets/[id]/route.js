import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Timesheet from "@/models/hr/Timesheet";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const canReview = (user) => user?.type === "company" || user?.roles?.some((role) => ["Admin", "HR Manager"].includes(role));

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!canReview(user)) return NextResponse.json({ success: false, message: "Only HR reviewers can approve timesheets" }, { status: 403 });
    if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ success: false, message: "Invalid time entry id" }, { status: 400 });
    const { status, rejectionReason = "" } = await req.json();
    if (!["Approved", "Rejected"].includes(status)) return NextResponse.json({ success: false, message: "Status must be Approved or Rejected" }, { status: 400 });
    if (status === "Rejected" && !rejectionReason.trim()) return NextResponse.json({ success: false, message: "A rejection reason is required" }, { status: 400 });

    const entry = await Timesheet.findOne({ _id: params.id, companyId: user.companyId });
    if (!entry) return NextResponse.json({ success: false, message: "Time entry not found" }, { status: 404 });
    if (entry.status !== "Pending") return NextResponse.json({ success: false, message: "Only pending entries can be reviewed" }, { status: 409 });
    entry.status = status;
    entry.reviewedBy = user.id;
    entry.reviewedAt = new Date();
    entry.rejectionReason = status === "Rejected" ? rejectionReason.trim() : "";
    await entry.save();
    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error("PUT /api/hr/timesheets/[id] error:", error);
    return NextResponse.json({ success: false, message: "Unable to review time entry" }, { status: 500 });
  }
}
