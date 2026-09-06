import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Homework from "@/models/school/Homework";
import Student from "@/models/school/Student";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import mongoose from "mongoose";

function isAuthorized(user) {
  if (!user) return false;
  if (["company", "school"].includes(user.type)) return true;
  const allowedRoles = [
    "admin",
    "school admin",
    "principal",
    "teacher",
    "student",
    "parent",
  ];
  const roles = Array.isArray(user.roles) ? user.roles : [user.role].filter(Boolean);
  return roles.some((role) =>
    allowedRoles.includes(String(role).trim().toLowerCase())
  );
}

async function validateUser(req, method = "POST") {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user, method)) {
      return { error: "Unauthorized", status: 403 };
    }
    return { user };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

export async function POST(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "POST");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const body = await req.json();
    const { student, content, remarks, files } = body;

    // Validate required fields
    if (!student) {
      return NextResponse.json({ success: false, message: "Student ID is required" }, { status: 400 });
    }
    if (!content && !files?.length) {
      return NextResponse.json({ success: false, message: "Provide content or file" }, { status: 400 });
    }

    // Find the homework
    const homework = await Homework.findOne({ _id: id, companyId: user.companyId });
    if (!homework) {
      return NextResponse.json({ success: false, message: "Homework not found" }, { status: 404 });
    }

    // ─── Find student using flexible ID ───────────────────────
    let studentDoc = null;
    // If student looks like a valid ObjectId, search by _id
    if (mongoose.Types.ObjectId.isValid(student)) {
      studentDoc = await Student.findOne({ _id: student, companyId: user.companyId });
    } else {
      // Otherwise, treat as custom studentId (e.g., "STD-0001")
      studentDoc = await Student.findOne({ studentId: student, companyId: user.companyId });
    }

    if (!studentDoc) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }

    // Check if student already submitted
    const existingSubmission = homework.submissions.find(
      (sub) => sub.student && sub.student.toString() === studentDoc._id.toString()
    );
    if (existingSubmission) {
      return NextResponse.json(
        { success: false, message: "Student already submitted for this homework" },
        { status: 400 }
      );
    }

    // Create submission
    const submission = {
      student: studentDoc._id,
      content: content || "",
      remarks: remarks || "",
      files: files || [],
      submittedDate: new Date(),
      score: null,
      feedback: "",
    };

    homework.submissions.push(submission);
    await homework.save();

    return NextResponse.json({ success: true, data: submission });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
