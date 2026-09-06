import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Timesheet from "@/models/hr/Timesheet";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const dateFromInput = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

function authenticatedEmployee(req) {
  const user = verifyJWT(getTokenFromHeader(req));
  return user?.employeeId ? user : null;
}

export async function GET(req) {
  try {
    await connectDB();
    const user = authenticatedEmployee(req);
    if (!user) return NextResponse.json({ success: false, message: "An employee account is required" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = { companyId: user.companyId, employeeId: user.employeeId };
    const month = searchParams.get("month");
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      query.date = { $gte: start, $lt: end };
    }

    const entries = await Timesheet.find(query).sort({ date: -1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    console.error("GET /api/hr/my-timesheet error:", error);
    return NextResponse.json({ success: false, message: "Unable to load timesheet entries" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = authenticatedEmployee(req);
    if (!user) return NextResponse.json({ success: false, message: "An employee account is required" }, { status: 401 });

    const { date: dateValue, project, task, hours, description = "" } = await req.json();
    const date = dateFromInput(dateValue);
    const numericHours = Number(hours);
    if (!date || !project?.trim() || !task?.trim() || !Number.isFinite(numericHours) || numericHours < 0.25 || numericHours > 24) {
      return NextResponse.json({ success: false, message: "Provide a date, project, task, and between 0.25 and 24 hours" }, { status: 400 });
    }

    const [{ total = 0 } = {}] = await Timesheet.aggregate([
      { $match: { companyId: user.companyId, employeeId: user.employeeId, date } },
      { $group: { _id: null, total: { $sum: "$hours" } } },
    ]);
    if (total + numericHours > 24) {
      return NextResponse.json({ success: false, message: "A day cannot contain more than 24 logged hours" }, { status: 400 });
    }

    const entry = await Timesheet.create({
      companyId: user.companyId, employeeId: user.employeeId, date,
      project: project.trim(), task: task.trim(), hours: numericHours, description: description.trim(),
    });
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    console.error("POST /api/hr/my-timesheet error:", error);
    return NextResponse.json({ success: false, message: error.name === "ValidationError" ? error.message : "Unable to add time entry" }, { status: 500 });
  }
}
