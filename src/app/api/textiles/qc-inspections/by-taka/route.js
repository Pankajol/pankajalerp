import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import QCInspection from "@/models/textiles/QCInspection";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const takaId = searchParams.get("takaId");
    if (!takaId) {
      return NextResponse.json({ success: false, message: "takaId is required" }, { status: 400 });
    }

    const inspections = await QCInspection.find({
      companyId: user.companyId,
      taka: takaId,
    })
      .populate("inspector", "name")
      .populate("parameters.parameter", "name code")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: inspections });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
