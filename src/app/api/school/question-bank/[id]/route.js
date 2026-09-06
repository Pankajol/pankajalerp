import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import QuestionBank from "@/models/school/QuestionBank";
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

export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
  }

  const questionBank = await QuestionBank.findOne({ _id: id, companyId: user.companyId }).lean();
  if (!questionBank) {
    return NextResponse.json({ success: false, message: "Question set not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: questionBank });
}

export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const questionBank = await QuestionBank.findOne({ _id: id, companyId: user.companyId });
    if (!questionBank) {
      return NextResponse.json({ success: false, message: "Question set not found" }, { status: 404 });
    }

    const updatable = ["title", "class", "subject", "questions", "tags", "isActive"];
    for (const field of updatable) {
      if (body[field] !== undefined) questionBank[field] = body[field];
    }

    await questionBank.save();
    return NextResponse.json({ success: true, data: questionBank, message: "Question set updated" });
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

  const questionBank = await QuestionBank.findOneAndUpdate(
    { _id: id, companyId: user.companyId },
    { isActive: false },
    { new: true }
  );
  if (!questionBank) {
    return NextResponse.json({ success: false, message: "Question set not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Question set deleted" });
}
