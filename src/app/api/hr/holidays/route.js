import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Holiday from "@/models/hr/Holiday";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") || new Date().getFullYear().toString();

    const holidays = await Holiday.find({
      companyId: user.companyId,
      date: { $regex: `^${year}` },
    }).sort({ date: 1 });

    return NextResponse.json({ success: true, data: holidays });
  } catch (err) {
    console.error("GET /api/hr/holidays error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "holidays", "create"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    if (!body.title?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(body.date || "")) return NextResponse.json({ success: false, message: "Title and a valid date (YYYY-MM-DD) are required" }, { status: 400 });
    if (await Holiday.findOne({ companyId: user.companyId, date: body.date })) return NextResponse.json({ success: false, message: "A holiday already exists on this date" }, { status: 409 });
    const holiday = await Holiday.create({ ...body, companyId: user.companyId });
    return NextResponse.json({ success: true, data: holiday }, { status: 201 });
  } catch (err) {
    console.error("POST /api/hr/holidays error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
