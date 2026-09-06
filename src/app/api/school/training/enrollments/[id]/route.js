import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TrainingEnrollment from "@/models/school/TrainingEnrollment";
import { validateUser } from "@/lib/auth";

export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const enrollment = await TrainingEnrollment.findOne({ _id: params.id, companyId: user.companyId })
    .populate("program", "title")
    .populate("teacher", "firstName lastName staffId");
  if (!enrollment) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: enrollment });
}

export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const body = await req.json();
  const enrollment = await TrainingEnrollment.findOneAndUpdate(
    { _id: params.id, companyId: user.companyId },
    body,
    { new: true, runValidators: true }
  );
  if (!enrollment) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: enrollment });
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const enrollment = await TrainingEnrollment.findOneAndDelete({ _id: params.id, companyId: user.companyId });
  if (!enrollment) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, message: "Deleted" });
}