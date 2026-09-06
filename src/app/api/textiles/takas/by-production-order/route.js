import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Taka from "@/models/textiles/Taka";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const poId = searchParams.get("poId");
    if (!poId) return NextResponse.json({ success: false, message: "poId required" }, { status: 400 });
    const takas = await Taka.find({ companyId: user.companyId, productionOrder: poId })
      .populate("fabric", "itemName itemCode")
      .populate("shade", "name code")
      .populate("lot", "lotNumber");
    return NextResponse.json({ success: true, data: takas });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
