// app/api/textiles/quality-parameters/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import QualityParameter from "@/models/textiles/QualityParameter";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const filter = { companyId: user.companyId };
    if (search) filter.$or = [{ code: { $regex: search, $options: "i" } }, { name: { $regex: search, $options: "i" } }];
    const params = await QualityParameter.find(filter).sort({ code: 1 });
    return NextResponse.json({ success: true, data: params });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const param = new QualityParameter({ ...body, companyId: user.companyId });
    await param.save();
    return NextResponse.json({ success: true, data: param });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}