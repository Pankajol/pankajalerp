import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Homework from "@/models/school/Homework";
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

export async function POST(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const body = await req.json();
    const { student, score, remarks, feedback } = body;

    if (!student || score === undefined) {
      return NextResponse.json({ success: false, message: "Student and score required" }, { status: 400 });
    }

    const homework = await Homework.findOne({ _id: id, companyId: user.companyId });
    if (!homework) {
      return NextResponse.json({ success: false, message: "Homework not found" }, { status: 404 });
    }

    const submission = homework.submissions.find(
      (s) => s.student.toString() === student
    );
    if (!submission) {
      return NextResponse.json({ success: false, message: "Submission not found" }, { status: 404 });
    }

    submission.score = score;
    if (remarks) submission.remarks = remarks;
    if (feedback !== undefined) submission.feedback = feedback;
    submission.gradedDate = new Date();
    submission.gradedBy = user.id || user._id;
    await homework.save();

    return NextResponse.json({
      success: true,
      message: "Submission graded",
      data: homework,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
