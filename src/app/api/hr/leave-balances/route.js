import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, hasPermission, verifyJWT } from "@/lib/auth";
import Employee from "@/models/hr/Employee";
import LeaveBalance from "@/models/hr/LeaveBalance";

// HR leave allocation register: every employee with their current balance.
export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "leaves", "view")) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const employees = await Employee.find({ companyId: user.companyId })
      .select("fullName email employeeCode status")
      .sort({ fullName: 1 })
      .lean();
    const balances = await LeaveBalance.find({ companyId: user.companyId }).lean();
    const byEmployee = new Map(balances.map((balance) => [String(balance.employeeId), balance]));

    const data = employees.map((employee) => ({
      employee,
      balance: byEmployee.get(String(employee._id)) || { casual: 12, sick: 8, paid: 15, unpaid: 0 },
    }));
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("GET /api/hr/leave-balances error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
