import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Timesheet from "@/models/hr/Timesheet";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const dateFromInput = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? new Date(`${value}T00:00:00.000Z`) : null;

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user?.employeeId || !mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const entry = await Timesheet.findOne({ _id: params.id, companyId: user.companyId, employeeId: user.employeeId });
    if (!entry) return NextResponse.json({ success: false, message: "Time entry not found" }, { status: 404 });

    const body = await req.json();
    if (body.status) {
      return NextResponse.json({ success: false, message: "Timesheets must be reviewed from the HR approval endpoint" }, { status: 403 });
    } else {
      if (entry.status !== "Pending") return NextResponse.json({ success: false, message: "Only pending entries can be changed" }, { status: 409 });
      const date = dateFromInput(body.date);
      const hours = Number(body.hours);
      if (!date || !body.project?.trim() || !body.task?.trim() || !Number.isFinite(hours) || hours < 0.25 || hours > 24) return NextResponse.json({ success: false, message: "Invalid time entry details" }, { status: 400 });
      const [{ total = 0 } = {}] = await Timesheet.aggregate([{ $match: { companyId: user.companyId, employeeId: user.employeeId, date, _id: { $ne: entry._id } } }, { $group: { _id: null, total: { $sum: "$hours" } } }]);
      if (total + hours > 24) return NextResponse.json({ success: false, message: "A day cannot contain more than 24 logged hours" }, { status: 400 });
      Object.assign(entry, { date, project: body.project.trim(), task: body.task.trim(), hours, description: (body.description || "").trim() });
    }
    await entry.save();
    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error("PUT /api/hr/my-timesheet/[id] error:", error);
    return NextResponse.json({ success: false, message: "Unable to update time entry" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user?.employeeId || !mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const entry = await Timesheet.findOne({ _id: params.id, companyId: user.companyId, employeeId: user.employeeId });
    if (!entry) return NextResponse.json({ success: false, message: "Time entry not found" }, { status: 404 });
    if (entry.status !== "Pending") return NextResponse.json({ success: false, message: "Only pending entries can be deleted" }, { status: 409 });
    await entry.deleteOne();
    return NextResponse.json({ success: true, message: "Time entry deleted" });
  } catch (error) {
    console.error("DELETE /api/hr/my-timesheet/[id] error:", error);
    return NextResponse.json({ success: false, message: "Unable to delete time entry" }, { status: 500 });
  }
}
