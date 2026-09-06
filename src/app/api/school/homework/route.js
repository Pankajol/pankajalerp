import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Homework from "@/models/school/Homework";
import Student from "@/models/school/Student";

import Satff from "@/models/school/Staff";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers ────────────────────────────────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.type === "school") return true;
  const allowedRoles = ["admin", "school admin", "principal", "teacher", "student", "parent"];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some((role) => allowedRoles.includes(role.trim().toLowerCase()));
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

function schoolRole(user) {
  return (user?.schoolRole || user?.role || "").toLowerCase();
}

function isStudentOrParent(user) {
  return user?.type === "school" && ["student", "parent"].includes(schoolRole(user));
}

function canManageHomework(user) {
  return user?.type === "company" || schoolRole(user) === "teacher" || (user?.type !== "school" && user?.type !== undefined);
}


export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "GET");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const classFilter = searchParams.get("class");
    const subjectFilter = searchParams.get("subject");
    const studentFilter = searchParams.get("student"); // for parents/students

    const query = { companyId: user.companyId };

    // Role‑based filtering
    const roles = (user.roles || []).map(r => r.toLowerCase());
    const isStudent = user.type === "student" || roles.includes("student");
    const isParent = user.type === "parent" || roles.includes("parent");

    if (isStudent) {
      // Student sees only their own class
      const studentClass = user.class; // ensure this is stored on the token or fetch from DB
      if (studentClass) query.class = studentClass;
    } else if (isParent) {
      // Parent sees homework for the selected student (if provided)
      // Optionally, you can also allow class filter
      if (studentFilter) {
        // Fetch the student's class from DB and filter by that class
        // For simplicity, assume the parent only sees homework for the selected student's class.
        const Student = mongoose.model("Student");
        const student = await Student.findById(studentFilter).select("class");
        if (student) query.class = student.class;
      } else {
        // If no student selected, show all homework (or you may want to show none)
        // We'll allow all.
      }
    }

    if (search) query.title = { $regex: search, $options: "i" };
    if (classFilter) query.class = classFilter;
    if (subjectFilter) query.subject = subjectFilter;

    const total = await Homework.countDocuments(query);
    const homework = await Homework.find(query)
      .populate("teacher", "firstName lastName")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: homework,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    if (!canManageHomework(user)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const required = ["title", "class", "subject", "dueDate"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    const homework = new Homework({
      ...body,
      teacher: body.teacher || undefined,
      companyId: user.companyId,
      createdBy: user.id || user._id,
    });

    await homework.save();
    await homework.populate("teacher", "firstName lastName");
    return NextResponse.json({ success: true, data: homework });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
