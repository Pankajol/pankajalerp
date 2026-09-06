// 📁 src/app/api/hr/payroll/route.js

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Payroll from "@/models/hr/Payroll";
import Timesheet from "@/models/hr/Timesheet";

const monthRange = (month) => {
  if (!/^\d{4}-\d{2}$/.test(month || "")) return null;
  const start = new Date(`${month}-01T00:00:00.000Z`);
  return { start, end: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)) };
};

// ─── GET /api/hr/payroll?month=YYYY-MM ───────────────────────
export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "payroll", "view"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // "YYYY-MM"

    const query = { companyId: user.companyId };
    if (month) query.month = month;

    const payrolls = await Payroll.find(query)
      .populate("employeeId", "fullName email employeeCode")
      .sort({ createdAt: -1 });

    // Live comparison makes later approved entries visible without modifying paid payrolls.
    const range = monthRange(month);
    const approvedHours = range ? await Timesheet.aggregate([
      { $match: { companyId: user.companyId, status: "Approved", date: { $gte: range.start, $lt: range.end } } },
      { $group: { _id: "$employeeId", hours: { $sum: "$hours" } } },
    ]) : [];
    const hoursByEmployee = new Map(approvedHours.map(item => [String(item._id), item.hours]));
    const data = payrolls.map(payroll => ({
      ...payroll.toObject(),
      approvedTimesheetHours: hoursByEmployee.get(String(payroll.employeeId?._id || payroll.employeeId)) || 0,
    }));
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("GET /api/hr/payroll error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ─── POST /api/hr/payroll ─────────────────────────────────────
export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "payroll", "create"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { employeeId, month, basic, hra, allowances, deductions, netSalary } = body;

    if (!employeeId || !month)
      return NextResponse.json({ success: false, message: "employeeId and month are required" }, { status: 400 });

    // Duplicate check — ek employee ek month mein ek hi payroll
    const existing = await Payroll.findOne({ employeeId, month, companyId: user.companyId });
    if (existing)
      return NextResponse.json({ success: false, message: "Payroll already exists for this employee and month" }, { status: 409 });

    const range = monthRange(month);
    if (!range) return NextResponse.json({ success: false, message: "month must be YYYY-MM" }, { status: 400 });
    if (!mongoose.Types.ObjectId.isValid(employeeId)) return NextResponse.json({ success: false, message: "Invalid employeeId" }, { status: 400 });
    const [approvedSummary] = await Timesheet.aggregate([
      { $match: { companyId: user.companyId, employeeId: new mongoose.Types.ObjectId(employeeId), status: "Approved", date: { $gte: range.start, $lt: range.end } } },
      { $group: { _id: null, hours: { $sum: "$hours" } } },
    ]);
    const payroll = await Payroll.create({
      companyId: user.companyId,
      employeeId, month,
      basic:      Number(basic      || 0),
      hra:        Number(hra        || 0),
      allowances: Number(allowances || 0),
      deductions: Number(deductions || 0),
      netSalary:  Number(netSalary  || 0),
      approvedTimesheetHours: approvedSummary?.hours || 0,
      timesheetCalculatedAt: new Date(),
    });

    return NextResponse.json({ success: true, data: payroll }, { status: 201 });
  } catch (err) {
    console.error("POST /api/hr/payroll error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
