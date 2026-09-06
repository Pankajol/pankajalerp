import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Exam from "@/models/school/Exam";
import Staff from "@/models/school/Staff"; 
import Student from "@/models/school/Student";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers ────────────────────────────────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.type === "school") return true;
  const allowedRoles = ["admin", "school admin", "principal", "teacher"];
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

function canManageExams(user) {
  return user?.type === "company" || schoolRole(user) === "teacher" || (user?.type !== "school" && user?.type !== undefined);
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
    const subject = searchParams.get("subject") || "";
    const statusFilter = searchParams.get("status") || "";
    const typeFilter = searchParams.get("type") || "";
    const search = searchParams.get("search") || "";

    const query = { companyId: user.companyId };
    if (isStudentOrParent(user)) {
      const student = await Student.findOne({ _id: user.id, companyId: user.companyId }).select("class").lean();
      if (!student) {
        return NextResponse.json({ success: true, data: [], meta: { page, limit, total: 0, pages: 0 } });
      }
      query.class = student.class;
      query.status = "published";
    }
    if (classFilter && !isStudentOrParent(user)) query.class = classFilter;
    if (subject) query.subject = subject;
    if (statusFilter && statusFilter !== "all" && !isStudentOrParent(user)) query.status = statusFilter;
    if (typeFilter && typeFilter !== "all") query.type = typeFilter;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [exams, total] = await Promise.all([
      Exam.find(query)
        .populate("teacher", "firstName lastName")
        .sort({ date: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Exam.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: exams,
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
    if (!canManageExams(user)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const required = ["title", "class", "subject", "date", "duration", "totalMarks"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    const exam = new Exam({
      ...body,
      teacher: body.teacher || undefined,
      duration: Number(body.duration),
      totalMarks: Number(body.totalMarks),
      companyId: user.companyId,
      createdBy: user.id || user._id,
    });

    await exam.save();
    await exam.populate("teacher", "firstName lastName");
    return NextResponse.json({ success: true, data: exam });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
