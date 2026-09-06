import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import JobCard from "@/models/ppc/JobCardModel";
import ProductionEvent from "@/models/ppc/ProductionEvent";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user?.companyId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const jobCard = await JobCard.findOne({ _id: params.id, companyId: user.companyId });
    if (!jobCard) return NextResponse.json({ success: false, message: "Job card not found" }, { status: 404 });
    if (!["Planned", "Released", "On Hold"].includes(jobCard.status)) return NextResponse.json({ success: false, message: `Cannot start a ${jobCard.status} job card` }, { status: 409 });
    const previous = jobCard.status;
    jobCard.status = "In Progress";
    jobCard.actualStartDate ||= new Date();
    await jobCard.save();
    await ProductionEvent.create({ companyId: user.companyId, entityType: "JobCard", entityId: jobCard._id, action: "STARTED", fromStatus: previous, toStatus: jobCard.status, performedBy: user.id || user._id });
    return NextResponse.json({ success: true, data: jobCard, message: "Job card started" });
  } catch (error) { return NextResponse.json({ success: false, message: error.message }, { status: 500 }); }
}

export { PUT as PATCH };
