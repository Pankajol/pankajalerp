import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Attendance from "@/models/school/Attendance";
import Student from "@/models/school/Student";
import Staff from "@/models/school/Staff";
import SchoolSettings from "@/models/school/SchoolSettings";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers ─────────────────────────────────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.type === "school") return true;
  const allowedRoles = [
    "admin", "school admin", "principal", "teacher",
  ];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some((role) => allowedRoles.includes(role.trim().toLowerCase()));
}

function schoolRole(user) {
  return (user?.schoolRole || user?.role || "").toLowerCase();
}

function isStudentOrParent(user) {
  return user?.type === "school" && ["student", "parent"].includes(schoolRole(user));
}

function isTeacherPortal(user) {
  return user?.type === "school" && schoolRole(user) === "teacher";
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

// ─── GET ─────────────────────────────────────────────────────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);

    // ✅ STATS MODE
    if (searchParams.get("stats") === "true") {
      return await getStats(user, searchParams);
    }

    // ── LIST MODE ──
    const date = searchParams.get("date");
    const type = searchParams.get("type");
    const entityId = searchParams.get("entityId");
    const statusFilter = searchParams.get("status");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit")) || 50, 1), 200);

    const query = { companyId: user.companyId };
    if (isStudentOrParent(user)) {
      query.type = "student";
      query.entityId = user.id;
    } else if (isTeacherPortal(user)) {
      query.type = "staff";
      query.entityId = user.id;
    }
    if (date) query.date = new Date(date);
    if (type) query.type = type;
    if (entityId) query.entityId = entityId;
    if (statusFilter) query.status = statusFilter;

    const skip = (page - 1) * limit;
    const [attendance, total] = await Promise.all([
      Attendance.find(query)
        .populate("entityId", "firstName lastName studentId staffId")
        .populate("markedBy", "name")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: attendance,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET attendance error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ─── Stats helper ──────────────────────────────────────────────────
async function getStats(user, searchParams) {
  try {
    const month = searchParams.get("month"); // "2025-03"
    let start, end;
    if (month) {
      const [year, m] = month.split("-").map(Number);
      start = new Date(year, m - 1, 1);
      end = new Date(year, m, 0);
    } else {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const match = {
      companyId: user.companyId,
      date: { $gte: start, $lte: end },
    };
    // If student/parent, only their own records
    if (isStudentOrParent(user)) {
      match.entityId = user.id;
      match.type = "student";
    }

    const stats = await Attendance.aggregate([
      { $match: match },
      // Case‑insensitive grouping
      { $group: { _id: { $toLower: "$status" }, count: { $sum: 1 } } },
    ]);

    const result = {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
      attendanceRate: 0,
    };

    stats.forEach((s) => {
      const key = s._id; // already lowercased
      if (key === "present") result.present = s.count;
      else if (key === "absent") result.absent = s.count;
      else if (key === "late") result.late = s.count;
      else if (key === "leave") result.leave = s.count;
      result.total += s.count;
    });

    result.attendanceRate = result.total ? (result.present / result.total) * 100 : 0;

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json({ success: false, message: "Failed to compute stats" }, { status: 500 });
  }
}

// ─── POST ──────────────────────────────────────────────────────────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    if (isStudentOrParent(user)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { date, type, records } = body;

    if (!date || !type || !records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Missing required fields: date, type, records",
      }, { status: 400 });
    }

    // Fetch attendance points from settings
    const settings = await SchoolSettings.findOne({ companyId: user.companyId });
    const points = settings?.attendancePoints || {
      present: 2,
      halfDay: 1,
      leave: 0,
      absent: -1,
    };

    const attendanceRecords = records.map((rec) => {
      const statusValue = rec.status || "present";
      return {
        date: new Date(date),
        type,
        entityId: rec.entityId,
        onModel: type === "student" ? "Student" : "Staff",
        status: statusValue,
        checkIn: rec.checkIn || null,
        checkOut: rec.checkOut || null,
        remarks: rec.remarks || "",
        points: points[statusValue] || 0,
        markedBy: user.id || user._id,
        companyId: user.companyId,
      };
    });

    // Bulk upsert
    const operations = attendanceRecords.map((rec) => ({
      updateOne: {
        filter: {
          companyId: user.companyId,
          entityId: rec.entityId,
          date: rec.date,
        },
        update: { $set: rec },
        upsert: true,
      },
    }));

    const result = await Attendance.bulkWrite(operations);

    // Update attendance points on the entity (Student/Staff)
    for (const rec of attendanceRecords) {
      const Model = rec.onModel === "Student" ? Student : Staff;
      await Model.updateOne(
        { _id: rec.entityId, companyId: user.companyId },
        { $inc: { attendancePoints: rec.points } }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Attendance saved (${result.upsertedCount + result.modifiedCount} records)`,
    });
  } catch (err) {
    console.error("POST attendance error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}