import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import ProductionJobCard from "@/models/ppc/ProductionJobCard";
import ProductionOrder from "@/models/ppc/ProductionOrder";
import Machine from "@/models/ppc/machineModel";
import Operator from "@/models/ppc/operatorModel";
import Downtime from "@/models/ppc/downtimeModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const allowed = (user) => user?.type === "company" || user?.roles?.some(role => ["admin", "production head", "project manager", "site engineer"].includes(role.toLowerCase()));
const percent = (part, total) => total ? Math.round((part / total) * 100) : 0;

export async function GET(req) {
  try {
    await dbConnect();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!allowed(user)) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    if (!mongoose.Types.ObjectId.isValid(user.companyId)) return NextResponse.json({ success: false, message: "Invalid company" }, { status: 400 });
    const companyId = new mongoose.Types.ObjectId(user.companyId);
    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(Number(searchParams.get("days")) || 30, 1), 365);
    const start = new Date(); start.setDate(start.getDate() - days); start.setHours(0, 0, 0, 0);
    const activeStatuses = ["In Progress", "QC", "On Hold"];
    const [totalJobCards, completedJobCards, inProgressJobCards, totalOrders, completedOrders, totalMachines, totalOperators, activeMachines, duration, downtime, topMachines, dailyOutput, statusBreakdown] = await Promise.all([
      ProductionJobCard.countDocuments({ companyId }), ProductionJobCard.countDocuments({ companyId, status: { $in: ["Completed", "Ready", "Delivered"] } }), ProductionJobCard.countDocuments({ companyId, status: { $in: activeStatuses } }),
      ProductionOrder.countDocuments({ companyId }), ProductionOrder.countDocuments({ companyId, status: "Completed" }), Machine.countDocuments({ companyId }), Operator.countDocuments({ companyId }), ProductionJobCard.distinct("machine", { companyId, status: { $in: activeStatuses } }),
      ProductionJobCard.aggregate([{ $match: { companyId, status: { $in: ["Completed", "Ready", "Delivered"] }, totalDuration: { $gt: 0 } } }, { $group: { _id: null, seconds: { $avg: "$totalDuration" }, quantity: { $sum: "$quantity" } } }]),
      Downtime.aggregate([{ $match: { companyId, fromTime: { $gte: start } } }, { $group: { _id: null, minutes: { $sum: "$durationMinutes" }, events: { $sum: 1 } } }]),
      ProductionJobCard.aggregate([{ $match: { companyId, machine: { $ne: null }, status: { $in: ["Completed", "Ready", "Delivered"] }, updatedAt: { $gte: start } } }, { $group: { _id: "$machine", cards: { $sum: 1 }, quantity: { $sum: "$quantity" } } }, { $sort: { quantity: -1 } }, { $limit: 5 }, { $lookup: { from: "machines", localField: "_id", foreignField: "_id", as: "machine" } }, { $unwind: { path: "$machine", preserveNullAndEmptyArrays: true } }, { $project: { _id: 0, machine: "$machine.name", cards: 1, quantity: 1 } }]),
      ProductionJobCard.aggregate([{ $match: { companyId, status: { $in: ["Completed", "Ready", "Delivered"] }, updatedAt: { $gte: start } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } }, quantity: { $sum: "$quantity" }, cards: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      ProductionJobCard.aggregate([{ $match: { companyId } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);
    const completed = completedJobCards;
    const downtimeMinutes = downtime[0]?.minutes || 0;
    return NextResponse.json({ success: true, data: {
      period: { days, from: start, to: new Date() },
      jobCards: { total: totalJobCards, completed, inProgress: inProgressJobCards, completionRate: percent(completed, totalJobCards), avgDurationSeconds: Math.round(duration[0]?.seconds || 0), completedQuantity: duration[0]?.quantity || 0, byStatus: statusBreakdown },
      productionOrders: { total: totalOrders, completed: completedOrders, completionRate: percent(completedOrders, totalOrders) },
      machines: { total: totalMachines, active: activeMachines.length, utilisationPercent: percent(activeMachines.length, totalMachines), topMachines },
      operators: { total: totalOperators },
      downtime: { minutes: downtimeMinutes, events: downtime[0]?.events || 0, hours: Number((downtimeMinutes / 60).toFixed(2)) },
      trend: dailyOutput,
    } });
  } catch (error) {
    console.error("PPC reports error:", error);
    return NextResponse.json({ success: false, message: "Unable to generate production report" }, { status: 500 });
  }
}
