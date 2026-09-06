import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import LeaveBalance from "@/models/hr/LeaveBalance";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "leaves", "view")) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    if (!hasPermission(user, "leaves", "approve") && String(user.employeeId) !== String(params.employeeId)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    let balance = await LeaveBalance.findOne({
      employeeId: params.employeeId,
      companyId:  user.companyId,
    });

    // Auto-create with defaults if none exists
    if (!balance) {
      balance = await LeaveBalance.create({
        employeeId: params.employeeId,
        companyId:  user.companyId,
      });
    }

    return NextResponse.json({ success: true, data: balance });
  } catch (err) {
    console.error("GET /api/hr/leave-balance/[employeeId] error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "leaves", "approve")) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body    = await req.json();
    const allowed = ["casual", "sick", "paid", "unpaid"];
    const update = Object.fromEntries(
      Object.entries(body).filter(([key, value]) => allowed.includes(key) && Number.isFinite(Number(value)) && Number(value) >= 0)
    );
    if (Object.keys(update).length !== allowed.length) {
      return NextResponse.json({ success: false, message: "Provide valid non-negative balances" }, { status: 400 });
    }
    const balance = await LeaveBalance.findOneAndUpdate(
      { employeeId: params.employeeId, companyId: user.companyId },
      update,
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: balance });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
