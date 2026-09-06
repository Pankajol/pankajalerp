import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TrainingAttendance from "@/models/school/TrainingAttendance";
import { validateUser } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session");
  const teacherId = searchParams.get("teacher");

  const query = { companyId: user.companyId };
  if (sessionId) query.session = sessionId;
  if (teacherId) query.teacher = teacherId;

  const attendance = await TrainingAttendance.find(query)
    .populate("session", "title")
    .populate("teacher", "firstName lastName staffId")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json({ success: true, data: attendance });
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const body = await req.json();
  const record = await TrainingAttendance.create({
    ...body,
    companyId: user.companyId,
  });
  return NextResponse.json({ success: true, data: record }, { status: 201 });
}