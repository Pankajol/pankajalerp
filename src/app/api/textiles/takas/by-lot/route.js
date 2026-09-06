// app/api/textiles/takas/by-lot/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Taka from "@/models/textiles/Taka";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lotId = searchParams.get("lotId");

    if (!lotId) {
      return NextResponse.json(
        { success: false, message: "lotId is required" },
        { status: 400 }
      );
    }

    const takas = await Taka.find({
      companyId: user.companyId,
      lot: lotId,
    })
      .populate("productionOrder", "orderNumber")
      .populate("fabric", "itemName itemCode")
      .populate("shade", "name code")
      .populate("lot", "lotNumber")
      .populate("warehouse", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: takas });
  } catch (err) {
    console.error("Error fetching takas by lot:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
