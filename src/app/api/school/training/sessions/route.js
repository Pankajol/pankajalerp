import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TrainingSession from "@/models/school/TrainingSession";
import { validateUser } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const { searchParams } = new URL(req.url);
  const programId = searchParams.get("program");

  const query = { companyId: user.companyId };
  if (programId) query.program = programId;

  const sessions = await TrainingSession.find(query)
    .populate("program", "title")
    .sort({ date: 1 })
    .lean();
  return NextResponse.json({ success: true, data: sessions });
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const body = await req.json();
  const session = await TrainingSession.create({
    ...body,
    companyId: user.companyId,
  });
  return NextResponse.json({ success: true, data: session }, { status: 201 });
}