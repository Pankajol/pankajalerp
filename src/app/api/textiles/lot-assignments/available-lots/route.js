import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Lot from "@/models/textiles/Lot";
import LotAssignment from "@/models/textiles/LotAssignment";
import ShadeCard from "@/models/textiles/ShadeCard"; // ✅ IMPORTANT: registers the model
import Item from "@/models/ItemModels";
export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const po = searchParams.get("productionOrder");
    if (!po) return NextResponse.json({ success: false, message: "productionOrder required" }, { status: 400 });

    // Get already assigned lot IDs for this PO
    const assigned = await LotAssignment.find({
      productionOrder: po,
      companyId: user.companyId,
    }).select("lot");
    const assignedIds = assigned.map(a => a.lot);

    const available = await Lot.find({
      companyId: user.companyId,
      status: "in-stock",
      _id: { $nin: assignedIds },
    })
      .populate("product", "itemName itemCode")
      .populate("shade", "name code")   // now ShadeCard model is registered
      .lean();

    return NextResponse.json({ success: true, data: available });
  } catch (err) {
    console.error("❌ available-lots error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}