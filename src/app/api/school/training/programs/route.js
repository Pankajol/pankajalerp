import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TrainingProgram from "@/models/school/TrainingProgram";
import { validateUser } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const programs = await TrainingProgram.find({ companyId: user.companyId })
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json({ success: true, data: programs });
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const body = await req.json();
  const program = await TrainingProgram.create({
    ...body,
    companyId: user.companyId,
    createdBy: user.id || user._id,
  });
  return NextResponse.json({ success: true, data: program }, { status: 201 });
}