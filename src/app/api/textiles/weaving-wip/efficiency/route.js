import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import WeavingWIP from "@/models/textiles/WeavingWIP";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const machine = searchParams.get("machine") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const filter = { companyId: user.companyId };

    if (machine) filter.machine = machine;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    // Aggregate by machine
    const aggregation = await WeavingWIP.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$machine",
          totalPlanned: { $sum: "$plannedQuantity" },
          totalProduced: { $sum: "$producedQuantity" },
          totalWaste: { $sum: "$waste" },
          totalDowntime: { $sum: "$downtime" },
          avgEfficiency: { $avg: "$efficiency" },
          recordCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "machines",
          localField: "_id",
          foreignField: "_id",
          as: "machineDetails",
        },
      },
      { $unwind: "$machineDetails" },
      {
        $project: {
          machine: "$machineDetails",
          totalPlanned: 1,
          totalProduced: 1,
          totalWaste: 1,
          totalDowntime: 1,
          avgEfficiency: 1,
          recordCount: 1,
        },
      },
      { $sort: { avgEfficiency: -1 } },
    ]);

    // Overall summary
    const overall = await WeavingWIP.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalPlanned: { $sum: "$plannedQuantity" },
          totalProduced: { $sum: "$producedQuantity" },
          totalWaste: { $sum: "$waste" },
          totalDowntime: { $sum: "$downtime" },
          avgEfficiency: { $avg: "$efficiency" },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        machineWise: aggregation,
        overall: overall[0] || { totalPlanned: 0, totalProduced: 0, totalWaste: 0, totalDowntime: 0, avgEfficiency: 0 },
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
