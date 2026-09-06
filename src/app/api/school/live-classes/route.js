import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import LiveClass from "@/models/school/LiveClass";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers ────────────────────────────────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.type === "school") return true;
  const allowedRoles = [
    "admin",
    "school admin",
    "principal",
    "teacher",
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

function canManageLiveClasses(user) {
  return user?.type === "company" || schoolRole(user) === "teacher" || (user?.type !== "school" && user?.type !== undefined);
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


export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit")) || 20, 1), 100);
    const classFilter = searchParams.get("class") || "";
    const teacher = searchParams.get("teacher") || "";
    const date = searchParams.get("date") || "";
    const search = searchParams.get("search") || "";

    const query = { companyId: user.companyId };
    if (classFilter) query.class = classFilter;
    if (teacher) query.teacher = teacher;
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0,0,0,0);
      const endDate = new Date(date);
      endDate.setHours(23,59,59,999);
      query.date = { $gte: startDate, $lte: endDate };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [classes, total] = await Promise.all([
      LiveClass.find(query)
        .populate("teacher", "firstName lastName")
        .sort({ date: 1, startTime: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LiveClass.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: classes,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    if (!canManageLiveClasses(user)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const required = ["title", "class", "subject", "date", "startTime", "endTime"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    const liveClass = new LiveClass({
      ...body,
      companyId: user.companyId,
      createdBy: user.id || user._id,
    });

    await liveClass.save();
    await liveClass.populate("teacher", "firstName lastName");
    return NextResponse.json({ success: true, data: liveClass });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
