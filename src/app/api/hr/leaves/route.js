import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Employee from "@/models/hr/Employee";
import Leave from "@/models/hr/Leave";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

/* =========================
   GET → All Leaves (Admin)
========================= */
export async function GET(req) {
  try {
    await connectDB();

    const user = verifyJWT(getTokenFromHeader(req));

    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // 🔐 permission check
    if (!hasPermission(user, "leaves", "view")) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = { companyId: user.companyId };
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (status) query.status = status;
    if (from || to) {
      query.$and = [];
      // Return a leave whenever any part of its date range intersects the
      // selected period, rather than only when its first day falls within it.
      if (from) query.$and.push({ toDate: { $gte: new Date(`${from}T00:00:00.000Z`) } });
      if (to) query.$and.push({ fromDate: { $lte: new Date(`${to}T23:59:59.999Z`) } });
    }

    const leaves = await Leave.find(query)
      .populate("employeeId", "fullName email")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: leaves });

  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/* =========================
   POST → Manual Leave Entry (HR/Admin)
========================= */
export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "leaves", "approve")) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { employeeId, fromDate, toDate, leaveType, reason } = await req.json();
    if (!employeeId || !fromDate || !toDate || !leaveType || !reason?.trim()) {
      return NextResponse.json({ success: false, message: "Employee, dates, leave type, and reason are required" }, { status: 400 });
    }
    if (!["Casual", "Sick", "Paid", "Unpaid"].includes(leaveType)) {
      return NextResponse.json({ success: false, message: "Invalid leave type" }, { status: 400 });
    }

    const start = new Date(`${fromDate}T00:00:00.000Z`);
    const end = new Date(`${toDate}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return NextResponse.json({ success: false, message: "Invalid date range" }, { status: 400 });
    }
    const employee = await Employee.findOne({ _id: employeeId, companyId: user.companyId });
    if (!employee) return NextResponse.json({ success: false, message: "Employee not found" }, { status: 404 });
    const overlap = await Leave.exists({
      companyId: user.companyId, employeeId, status: { $in: ["Pending", "Approved"] },
      fromDate: { $lte: end }, toDate: { $gte: start },
    });
    if (overlap) return NextResponse.json({ success: false, message: "This employee already has leave in the selected range" }, { status: 400 });

    const leave = await Leave.create({ companyId: user.companyId, employeeId, fromDate: start, toDate: end, leaveType, reason: reason.trim() });
    return NextResponse.json({ success: true, data: leave }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
