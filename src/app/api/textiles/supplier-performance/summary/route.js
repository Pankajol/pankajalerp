import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import SupplierPerformance from "@/models/textiles/SupplierPerformance";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const summary = await SupplierPerformance.aggregate([
      { $match: { companyId: user.companyId } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
          avgOverallScore: { $avg: "$overallScore" },
          totalSpend: { $sum: "$totalCost" },
        },
      },
    ]);

    // Get top suppliers by rating
    const topSuppliers = await SupplierPerformance.aggregate([
      { $match: { companyId: user.companyId } },
      { $sort: { overallScore: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "suppliers",
          localField: "supplier",
          foreignField: "_id",
          as: "supplierDetails",
        },
      },
      { $unwind: "$supplierDetails" },
      {
        $project: {
          supplierName: "$supplierDetails.name",
          rating: 1,
          overallScore: 1,
          periodStart: 1,
          periodEnd: 1,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        topSuppliers,
        totalRatings: summary.reduce((sum, s) => sum + s.count, 0),
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
