import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import JobWorkRequest from "@/models/textiles/JobWorkRequest";

export async function POST(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const request = await JobWorkRequest.findOne({ _id: id, companyId: user.companyId });
    if (!request) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    if (request.status !== "submitted") {
      return NextResponse.json(
        { success: false, message: "Only submitted requests can be approved" },
        { status: 400 }
      );
    }

    request.status = "approved";
    request.approvedBy = user.id;
    request.approvedAt = new Date();
    await request.save();

    return NextResponse.json({ success: true, data: request });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
