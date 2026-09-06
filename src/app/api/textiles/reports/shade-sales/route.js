import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Taka from "@/models/textiles/Taka";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const data = await Taka.aggregate([
      { $match: { companyId: user.companyId, shade: { $ne: null } } },
      { $group: { _id: "$shade", value: { $sum: { $ifNull: ["$quantity", 0] } } } },
      { $sort: { value: -1 } },
      { $limit: 10 },
      { $lookup: { from: "shadecards", localField: "_id", foreignField: "_id", as: "shade" } },
      { $unwind: { path: "$shade", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, name: { $ifNull: ["$shade.shadeName", "Unspecified"] }, value: 1, colorCode: "$shade.colorCode" } },
    ]);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
