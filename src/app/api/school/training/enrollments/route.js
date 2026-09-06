import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TrainingEnrollment from "@/models/school/TrainingEnrollment";
import { validateUser } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const { searchParams } = new URL(req.url);
  const programId = searchParams.get("program");
  const teacherId = searchParams.get("teacher");

  const query = { companyId: user.companyId };
  if (programId) query.program = programId;
  if (teacherId) query.teacher = teacherId;

  const enrollments = await TrainingEnrollment.find(query)
    .populate("program", "title")
    .populate("teacher", "firstName lastName staffId")
    .sort({ enrollmentDate: -1 })
    .lean();
  return NextResponse.json({ success: true, data: enrollments });
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const body = await req.json();
  const enrollment = await TrainingEnrollment.create({
    ...body,
    companyId: user.companyId,
  });
  return NextResponse.json({ success: true, data: enrollment }, { status: 201 });
}