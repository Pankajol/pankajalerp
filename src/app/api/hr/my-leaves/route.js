import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Leave from "@/models/hr/Leave";
import LeaveBalance from "@/models/hr/LeaveBalance";
import Notification from "@/models/Notification"; // 🔥 ADD
import CompanyUser from "@/models/CompanyUser";   // 🔥 ADD
import Employee from "@/models/hr/Employee";      // 🔥 ADD
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/* =========================
   GET → My Leaves
========================= */
export async function GET(req) {
  try {
    await connectDB();

    const user = verifyJWT(getTokenFromHeader(req));

    if (!user || !user.employeeId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const [leaves, balance] = await Promise.all([
      Leave.find({
      employeeId: user.employeeId,
      companyId: user.companyId, // 🔥 IMPORTANT
      }).sort({ createdAt: -1 }),
      LeaveBalance.findOneAndUpdate(
        { employeeId: user.employeeId, companyId: user.companyId },
        { $setOnInsert: { employeeId: user.employeeId, companyId: user.companyId } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: leaves,
      balance,
    });

  } catch (err) {
    console.error("GET /my-leaves ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/* =========================
   POST → Apply Leave
========================= */
export async function POST(req) {
  try {
    await connectDB();

    const user = verifyJWT(getTokenFromHeader(req));

    if (!user || !user.employeeId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { fromDate, toDate, leaveType, reason, attachmentUrl } = body;

    // =========================
    // ✅ VALIDATION
    // =========================
    if (!fromDate || !toDate || !leaveType || !reason) {
      return NextResponse.json(
        { success: false, message: "All fields required" },
        { status: 400 }
      );
    }

    if (!["Casual", "Sick", "Paid", "Unpaid"].includes(leaveType)) {
      return NextResponse.json(
        { success: false, message: "Invalid leave type" },
        { status: 400 }
      );
    }

    const start = new Date(`${fromDate}T00:00:00.000Z`);
    const end = new Date(`${toDate}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return NextResponse.json(
        { success: false, message: "Invalid date range" },
        { status: 400 }
      );
    }

    // =========================
    // 🔥 OVERLAP CHECK
    // =========================
    const exists = await Leave.findOne({
      employeeId: user.employeeId,
      companyId: user.companyId,
      status: { $in: ["Pending", "Approved"] },
      $or: [
        {
          fromDate: { $lte: end },
          toDate: { $gte: start },
        },
      ],
    });

    if (exists) {
      return NextResponse.json(
        { success: false, message: "Leave already exists in this range" },
        { status: 400 }
      );
    }

    // =========================
    // 📊 LEAVE BALANCE CHECK
    // =========================
    const employee = await Employee.findById(user.employeeId);

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "Employee not found" },
        { status: 404 }
      );
    }

    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const balance = await LeaveBalance.findOneAndUpdate(
      { employeeId: user.employeeId, companyId: user.companyId },
      { $setOnInsert: { employeeId: user.employeeId, companyId: user.companyId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

if (
  (leaveType === "Casual" && balance.casual < days) ||
  (leaveType === "Sick" && balance.sick < days) ||
  (leaveType === "Paid" && balance.paid < days)
) {
  return NextResponse.json({
    success: false,
    message: "Insufficient leave balance",
  });
}

    // =========================
    // 📝 CREATE LEAVE
    // =========================
    const leave = await Leave.create({
      companyId: user.companyId,
      employeeId: user.employeeId,
      fromDate: start,
      toDate: end,
      leaveType,
      reason,
      attachmentUrl,
      status: "Pending",
    });

    // =========================
    // 🔔 NOTIFICATION → ADMIN
    // =========================
    const admins = await CompanyUser.find({
      companyId: user.companyId,
      roles: { $in: ["Admin", "HR Manager"] },
    });

    const employeeUser = await CompanyUser.findOne({
      employeeId: user.employeeId,
    });

    for (const admin of admins) {
      await Notification.create({
        companyId: user.companyId,
        userId: admin._id,

        title: "New Leave Request",

        message: `${employeeUser?.name || "Employee"} applied for leave`,

        type: "leave",
        referenceId: leave._id,
        referenceModel: "Leave",
      });
    }

    return NextResponse.json({
      success: true,
      data: leave,
    });

  } catch (err) {
    console.error("POST /my-leaves ERROR:", err);

    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
