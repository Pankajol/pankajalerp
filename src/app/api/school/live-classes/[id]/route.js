import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import LiveClass from "@/models/school/LiveClass";
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

  const liveClass = await LiveClass.findOne({ _id: id, companyId: user.companyId })
    .populate("teacher", "firstName lastName")
    .lean();
  if (!liveClass) return NextResponse.json({ success: false, message: "Live class not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: liveClass });
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
    const liveClass = await LiveClass.findOne({ _id: id, companyId: user.companyId });
    if (!liveClass) return NextResponse.json({ success: false, message: "Live class not found" }, { status: 404 });

    const updatable = [
      "title",
      "description",
      "class",
      "subject",
      "teacher",
      "date",
      "startTime",
      "endTime",
      "meetingLink",
      "platform",
      "recordingLink",
      "isActive",
    ];

    for (const field of updatable) {
      if (body[field] !== undefined) liveClass[field] = body[field];
    }

    await liveClass.save();
    await liveClass.populate("teacher", "firstName lastName");
    return NextResponse.json({ success: true, data: liveClass, message: "Live class updated" });
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

  const liveClass = await LiveClass.findOneAndDelete({ _id: id, companyId: user.companyId });
  if (!liveClass) return NextResponse.json({ success: false, message: "Live class not found" }, { status: 404 });

  return NextResponse.json({ success: true, message: "Live class deleted" });
}
