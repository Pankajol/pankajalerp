import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Exam from "@/models/school/Exam";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
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

async function getScopedExam(id, companyId) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Exam.findOne({ _id: id, companyId });
}

export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const { id } = await params;
  const exam = await getScopedExam(id, user.companyId);
  if (!exam) return NextResponse.json({ success: false, message: "Exam not found" }, { status: 404 });

  await exam.populate("teacher", "firstName lastName");
  return NextResponse.json({ success: true, data: exam });
}

export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const exam = await getScopedExam(id, user.companyId);
    if (!exam) return NextResponse.json({ success: false, message: "Exam not found" }, { status: 404 });

    const body = await req.json();
    const updatable = [
      "title",
      "class",
      "subject",
      "teacher",
      "date",
      "duration",
      "totalMarks",
      "type",
      "instructions",
      "randomizeQuestions",
      "allowNavigation",
      "showResults",
      "questions",
      "status",
    ];

    for (const field of updatable) {
      if (body[field] !== undefined) exam[field] = body[field];
    }
    if (body.teacher === "") exam.teacher = undefined;
    if (body.duration !== undefined) exam.duration = Number(body.duration);
    if (body.totalMarks !== undefined) exam.totalMarks = Number(body.totalMarks);

    await exam.save();
    await exam.populate("teacher", "firstName lastName");
    return NextResponse.json({ success: true, data: exam, message: "Exam updated" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message || "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
  }

  const exam = await Exam.findOneAndDelete({ _id: id, companyId: user.companyId });
  if (!exam) return NextResponse.json({ success: false, message: "Exam not found" }, { status: 404 });

  return NextResponse.json({ success: true, message: "Exam deleted" });
}
