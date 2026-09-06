// app/api/textiles/mrp/runs/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import MRP from "@/models/textiles/MRP";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const runs = await MRP.find({ companyId: user.companyId })
      .populate("createdBy", "name")
      .sort({ runDate: -1 });
    return NextResponse.json({ success: true, data: runs });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

