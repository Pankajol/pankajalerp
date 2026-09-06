import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Homework from "@/models/school/Homework";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
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

function normalizeSubmission(submission) {
  const plain = submission.toObject ? submission.toObject() : submission;
  const firstFile = plain.files?.[0];
  return {
    ...plain,
    content: plain.content || plain.remarks || "",
    feedback: plain.feedback || "",
    fileUrl: firstFile?.url || "",
    fileName: firstFile?.name || "",
  };
}

async function findSubmission(homeworkId, submissionId, companyId) {
  if (!mongoose.Types.ObjectId.isValid(homeworkId) || !mongoose.Types.ObjectId.isValid(submissionId)) {
    return { error: "Invalid ID", status: 400 };
  }

  const homework = await Homework.findOne({ _id: homeworkId, companyId })
    .populate("submissions.student", "firstName lastName studentId class section parent")
    .lean();

  if (!homework) return { error: "Homework not found", status: 404 };

  const submission = homework.submissions?.find((item) => item._id?.toString() === submissionId);
  if (!submission) return { error: "Submission not found", status: 404 };

  return { homework, submission: normalizeSubmission(submission) };
}

export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const { id, submissionId } = await params;
  const result = await findSubmission(id, submissionId, user.companyId);
  if (result.error) {
    return NextResponse.json({ success: false, message: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, data: result.submission, homework: result.homework });
}

export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id, submissionId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(submissionId)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const homework = await Homework.findOne({ _id: id, companyId: user.companyId });
    if (!homework) {
      return NextResponse.json({ success: false, message: "Homework not found" }, { status: 404 });
    }

    const submission = homework.submissions.id(submissionId);
    if (!submission) {
      return NextResponse.json({ success: false, message: "Submission not found" }, { status: 404 });
    }

    if (body.score === undefined || Number(body.score) < 0) {
      return NextResponse.json({ success: false, message: "Valid score required" }, { status: 400 });
    }

    submission.score = Number(body.score);
    submission.feedback = body.feedback || "";
    submission.remarks = body.feedback || submission.remarks;
    submission.gradedDate = new Date();
    submission.gradedBy = user.id || user._id;

    await homework.save();
    await homework.populate("submissions.student", "firstName lastName studentId class section parent");

    const updated = homework.submissions.id(submissionId);
    return NextResponse.json({
      success: true,
      message: "Submission graded",
      data: normalizeSubmission(updated),
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message || "Update failed" }, { status: 500 });
  }
}
