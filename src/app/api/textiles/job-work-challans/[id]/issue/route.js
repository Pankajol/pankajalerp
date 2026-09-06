import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import JobWorkChallan from "@/models/textiles/JobWorkChallan";
import JobWorkRequest from "@/models/textiles/JobWorkRequest";
import Taka from "@/models/textiles/Taka";

export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const challan = await JobWorkChallan.findOne({ _id: id, companyId: user.companyId });
    if (!challan) {
      return NextResponse.json({ success: false, message: "Challan not found" }, { status: 404 });
    }
    if (challan.status !== "draft") {
      return NextResponse.json(
        { success: false, message: "Only draft challans can be issued" },
        { status: 400 }
      );
    }

    const takaIds = challan.items.map((item) => item.taka);
    const availableCount = await Taka.countDocuments({
      _id: { $in: takaIds },
      companyId: user.companyId,
      status: { $in: ["available", "in-production"] },
    });
    if (availableCount !== takaIds.length) {
      return NextResponse.json(
        { success: false, message: "One or more takas are no longer available" },
        { status: 409 }
      );
    }

    // Update challan status
    challan.status = "issued";
    challan.issuedBy = user.id;
    challan.issuedAt = new Date();
    await challan.save();

    // Update Taka statuses to "job-work"
    await Taka.updateMany(
      { _id: { $in: takaIds }, companyId: user.companyId },
      { status: "job-work" }
    );
    await JobWorkRequest.updateOne(
      { _id: challan.request, companyId: user.companyId },
      { status: "in-progress" }
    );

    return NextResponse.json({ success: true, data: challan });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
