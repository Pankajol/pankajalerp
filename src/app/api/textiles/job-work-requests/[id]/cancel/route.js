import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import JobWorkRequest from "@/models/textiles/JobWorkRequest";
import JobWorkChallan from "@/models/textiles/JobWorkChallan";

export async function POST(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { reason } = await req.json();

    const { id } = await params;
    const request = await JobWorkRequest.findOne({ _id: id, companyId: user.companyId });
    if (!request) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    if (request.status === "cancelled") {
      return NextResponse.json(
        { success: false, message: "Request is already cancelled" },
        { status: 400 }
      );
    }
    if (!["draft", "submitted", "approved"].includes(request.status)) {
      return NextResponse.json(
        { success: false, message: "This request can no longer be cancelled" },
        { status: 400 }
      );
    }
    if (await JobWorkChallan.exists({ request: id, companyId: user.companyId })) {
      return NextResponse.json(
        { success: false, message: "A challan already exists for this request" },
        { status: 409 }
      );
    }

    request.status = "cancelled";
    request.cancelledBy = user.id;
    request.cancelledAt = new Date();
    request.cancellationReason = reason || "No reason provided";
    await request.save();

    return NextResponse.json({ success: true, data: request });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
