import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TrainingAttendance from "@/models/school/TrainingAttendance";
import { validateUser } from "@/lib/auth";

export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const record = await TrainingAttendance.findOne({ _id: params.id, companyId: user.companyId })
    .populate("session", "title")
    .populate("teacher", "firstName lastName staffId");
  if (!record) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: record });
}

export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const body = await req.json();
  const record = await TrainingAttendance.findOneAndUpdate(
    { _id: params.id, companyId: user.companyId },
    body,
    { new: true, runValidators: true }
  );
  if (!record) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: record });
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const record = await TrainingAttendance.findOneAndDelete({ _id: params.id, companyId: user.companyId });
  if (!record) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, message: "Deleted" });
}