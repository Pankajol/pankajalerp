import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import WeavingWIP from "@/models/textiles/WeavingWIP";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const rows = await WeavingWIP.aggregate([
      { $match: { companyId: user.companyId } },
      { $group: {
        _id: { year: { $year: "$date" }, month: { $month: "$date" } },
        waste: { $sum: { $ifNull: ["$waste", 0] } },
        produced: { $sum: { $ifNull: ["$producedQuantity", 0] } },
      } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ]);
    const formatter = new Intl.DateTimeFormat("en", { month: "short" });
    const data = rows.map((row) => ({
      month: `${formatter.format(new Date(Date.UTC(row._id.year, row._id.month - 1, 1)))} ${row._id.year}`,
      waste: Number((row.produced > 0 ? (row.waste / (row.produced + row.waste)) * 100 : 0).toFixed(2)),
      wasteQuantity: row.waste,
    }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
