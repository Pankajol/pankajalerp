import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Attendance from "@/models/school/Attendance";
import Student from "@/models/school/Student";
import { validateUser } from "@/lib/auth";

function startOfDay(value) {
  const date = value ? new Date(value) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value) {
  const date = value ? new Date(value) : new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function schoolRole(user) {
  return (user?.schoolRole || user?.role || "").toLowerCase();
}

function scopedPortalQuery(user) {
  const role = schoolRole(user);
  if (user?.type === "school" && ["student", "parent"].includes(role)) {
    return { type: "student", entityId: user.studentId || user.id };
  }
  if (user?.type === "school" && role === "teacher") {
    return { type: "staff", entityId: user.staffId || user.id };
  }
  return {};
}

function emptySummary(entity) {
  return {
    entity,
    present: 0,
    absent: 0,
    halfDay: 0,
    leave: 0,
    total: 0,
    presentPercentage: 0,
  };
}

function entityPayload(entity, type) {
  if (!entity) {
    return type === "staff"
      ? { firstName: "Unknown", lastName: "", staffId: "" }
      : { firstName: "Unknown", lastName: "", studentId: "" };
  }

  return {
    _id: entity._id,
    firstName: entity.firstName || "",
    lastName: entity.lastName || "",
    studentId: entity.studentId || "",
    staffId: entity.staffId || "",
    class: entity.class || "",
    section: entity.section || "",
  };
}

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "GET");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "student";
    const from = searchParams.get("from") || searchParams.get("startDate");
    const to = searchParams.get("to") || searchParams.get("endDate");
    const classFilter = searchParams.get("class");
    const studentId = searchParams.get("studentId");
    const statusFilter = searchParams.get("status");
    const portalScope = scopedPortalQuery(user);

    const query = {
      companyId: user.companyId,
      type,
      date: { $gte: startOfDay(from), $lte: endOfDay(to) },
      ...portalScope,
    };

    if (studentId && !portalScope.entityId) query.entityId = studentId;
    if (statusFilter) query.status = statusFilter;

    if (classFilter && query.type === "student" && !portalScope.entityId) {
      const students = await Student.find({ companyId: user.companyId, class: classFilter })
        .select("_id")
        .lean();
      query.entityId = { $in: students.map((student) => student._id) };
    }

    const records = await Attendance.find(query)
      .populate({
        path: "entityId",
        select: "firstName lastName studentId staffId class section",
        strictPopulate: false,
      })
      .sort({ date: 1, createdAt: 1 })
      .lean();

    const summaries = new Map();
    records.forEach((record) => {
      const entity = entityPayload(record.entityId, record.type);
      const key = String(entity._id || record.entityId || "unknown");
      if (!summaries.has(key)) summaries.set(key, emptySummary(entity));

      const summary = summaries.get(key);
      if (record.status === "present") summary.present += 1;
      else if (record.status === "absent") summary.absent += 1;
      else if (record.status === "half-day") summary.halfDay += 1;
      else if (record.status === "leave") summary.leave += 1;
      summary.total += 1;
    });

    const data = Array.from(summaries.values()).map((summary) => ({
      ...summary,
      presentPercentage: summary.total ? (summary.present / summary.total) * 100 : 0,
    }));

    return NextResponse.json({
      success: true,
      data,
      meta: {
        total: data.length,
        records: records.length,
        from: startOfDay(from).toISOString(),
        to: endOfDay(to).toISOString(),
      },
    });
  } catch (err) {
    console.error("Attendance Report Error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
