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
    const body = await req.json();
    const completedQty = body.completedQty ?? body.qtyCompleted ?? 0;
    const note = body.note || "";
    const jobCard = await JobCard.findOne({ _id: params.id, companyId: user.companyId });
    if (!jobCard) return NextResponse.json({ success: false, message: "Job card not found" }, { status: 404 });
    if (jobCard.status !== "In Progress") return NextResponse.json({ success: false, message: "Only an in-progress job card can be ended" }, { status: 409 });
    const quantity = Number(completedQty);
    if (!Number.isFinite(quantity) || quantity < jobCard.completedQty || quantity > jobCard.qtyToManufacture) return NextResponse.json({ success: false, message: `Completed quantity must be between ${jobCard.completedQty} and ${jobCard.qtyToManufacture}` }, { status: 400 });
    const endedAt = new Date(), startedAt = jobCard.actualStartDate || endedAt;
    jobCard.completedQty = quantity;
    jobCard.actualEndDate = endedAt;
    jobCard.totalDuration += Math.max(0, Math.round((endedAt - startedAt) / 1000));
    jobCard.timeLogs.push({ employee: user.id || user._id, fromTime: startedAt, toTime: endedAt, timeInMins: Math.max(0, Math.round((endedAt - startedAt) / 60000)), completedQty: quantity });
    jobCard.status = quantity >= jobCard.qtyToManufacture ? "Completed" : "On Hold";
    await jobCard.save();
    await ProductionEvent.create({ companyId: user.companyId, entityType: "JobCard", entityId: jobCard._id, action: jobCard.status === "Completed" ? "COMPLETED" : "PARTIAL_OUTPUT", fromStatus: "In Progress", toStatus: jobCard.status, note, metadata: { completedQty: quantity }, performedBy: user.id || user._id });
    return NextResponse.json({ success: true, data: jobCard, message: jobCard.status === "Completed" ? "Job card completed" : "Partial output recorded; job card put on hold" });
  } catch (error) { return NextResponse.json({ success: false, message: error.message }, { status: 500 }); }
}

export { PUT as PATCH };
