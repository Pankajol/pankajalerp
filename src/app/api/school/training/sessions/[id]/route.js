import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TrainingSession from "@/models/school/TrainingSession";
import { validateUser } from "@/lib/auth";

export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const session = await TrainingSession.findOne({ _id: params.id, companyId: user.companyId })
    .populate("program", "title");
  if (!session) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: session });
}

export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const body = await req.json();
  const session = await TrainingSession.findOneAndUpdate(
    { _id: params.id, companyId: user.companyId },
    body,
    { new: true, runValidators: true }
  );
  if (!session) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: session });
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const session = await TrainingSession.findOneAndDelete({ _id: params.id, companyId: user.companyId });
  if (!session) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, message: "Deleted" });
}