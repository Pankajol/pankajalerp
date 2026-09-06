import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Timesheet from "@/models/hr/Timesheet";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const canReport = (user) => user?.type === "company" || user?.roles?.some((role) => ["Admin", "HR Manager", "Project Manager"].includes(role));

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!canReport(user)) return NextResponse.json({ success: false, message: "Not allowed to view timesheet reports" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const groupBy = searchParams.get("groupBy") || "project";
    if (!["project", "employee", "month"].includes(groupBy)) return NextResponse.json({ success: false, message: "groupBy must be project, employee, or month" }, { status: 400 });
    const match = { companyId: user.companyId, status: "Approved" };
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      match.date = { $gte: start, $lt: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)) };
    }
    const id = groupBy === "project" ? "$project" : groupBy === "employee" ? "$employeeId" : { $dateToString: { format: "%Y-%m", date: "$date" } };
    const rows = await Timesheet.aggregate([{ $match: match }, { $group: { _id: id, totalHours: { $sum: "$hours" }, entries: { $sum: 1 } } }, { $sort: { totalHours: -1 } }]);
    return NextResponse.json({ success: true, data: rows, source: "approved-timesheets" });
  } catch (error) {
    console.error("GET /api/hr/timesheets/reports error:", error);
    return NextResponse.json({ success: false, message: "Unable to generate timesheet report" }, { status: 500 });
  }
}
