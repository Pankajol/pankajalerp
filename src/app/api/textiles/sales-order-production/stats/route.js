import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import SalesOrderProduction from "@/models/textiles/SalesOrderProduction";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const stats = await SalesOrderProduction.aggregate([
      { $match: { companyId: user.companyId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalPlanned: { $sum: "$plannedQuantity" },
          totalProduced: { $sum: "$producedQuantity" },
        },
      },
    ]);

    // Default all statuses to 0
    const result = {
      pending: 0,
      "in-progress": 0,
      completed: 0,
      delayed: 0,
      cancelled: 0,
      totalPlanned: 0,
      totalProduced: 0,
      pendingQuantity: 0,
    };

    for (const s of stats) {
      result[s._id] = s.count || 0;
      result.totalPlanned += s.totalPlanned || 0;
      result.totalProduced += s.totalProduced || 0;
    }

    // Count total integration records
    const total = await SalesOrderProduction.countDocuments({ companyId: user.companyId });
    result.total = total;

    // Pending quantity = totalPlanned - totalProduced
    result.pendingQuantity = result.totalPlanned - result.totalProduced;

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
