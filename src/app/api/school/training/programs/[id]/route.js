import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TrainingProgram from "@/models/school/TrainingProgram";
import { validateUser } from "@/lib/auth";

export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const program = await TrainingProgram.findOne({ _id: params.id, companyId: user.companyId })
    .populate("createdBy", "name email");
  if (!program) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: program });
}

export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const body = await req.json();
  const program = await TrainingProgram.findOneAndUpdate(
    { _id: params.id, companyId: user.companyId },
    body,
    { new: true, runValidators: true }
  );
  if (!program) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: program });
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const program = await TrainingProgram.findOneAndDelete({ _id: params.id, companyId: user.companyId });
  if (!program) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, message: "Deleted" });
}