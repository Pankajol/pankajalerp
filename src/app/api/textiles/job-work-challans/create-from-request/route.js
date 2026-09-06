import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import JobWorkRequest from "@/models/textiles/JobWorkRequest";
import JobWorkChallan from "@/models/textiles/JobWorkChallan";

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { requestId, ...challanData } = body;

    if (!requestId) {
      return NextResponse.json(
        { success: false, message: "requestId is required" },
        { status: 400 }
      );
    }

    // Fetch the request
    const request = await JobWorkRequest.findOne({
      _id: requestId,
      companyId: user.companyId,
      status: "approved",
    }).populate("takas");

    if (!request) {
      return NextResponse.json(
        { success: false, message: "Approved request not found" },
        { status: 404 }
      );
    }

    // Build challan items from request takas
    const items = request.takas.map((taka) => ({
      taka: taka._id,
      quantity: taka.quantity,
      actualMeters: taka.quantity,
    }));

    const challan = new JobWorkChallan({
      ...challanData,
      request: request._id,
      vendor: request.vendor,
      process: request.process,
      items,
      companyId: user.companyId,
      challanNumber: undefined,
    });
    await challan.save();

    return NextResponse.json({ success: true, data: challan });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
