import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import JobWorkRequest from "@/models/textiles/JobWorkRequest";

export async function POST(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const request = await JobWorkRequest.findOne({ _id: id, companyId: user.companyId });
    if (!request) return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
    if (request.status !== "draft") {
      return NextResponse.json({ success: false, message: "Only draft requests can be submitted" }, { status: 400 });
    }
    if (!request.vendor || !request.process?.trim() || !request.takas?.length) {
      return NextResponse.json({ success: false, message: "Complete the vendor, process and taka details before submitting" }, { status: 400 });
    }
    request.status = "submitted";
    await request.save();
    return NextResponse.json({ success: true, data: request });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
