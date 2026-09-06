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
    const qrData = searchParams.get("qr") || "";
    const takaNumber = searchParams.get("taka") || "";

    // If QR data is provided, try to parse it
    let searchValue = takaNumber;
    if (qrData) {
      try {
        // Try to parse QR data as JSON
        const parsed = JSON.parse(qrData);
        searchValue = parsed.takaId || parsed.takaNumber || parsed.id;
      } catch {
        // If not JSON, treat as plain string
        searchValue = qrData;
      }
    }

    if (!searchValue) {
      return NextResponse.json(
        { success: false, message: "No QR or Taka data provided" },
        { status: 400 }
      );
    }

    // Find Taka by number or ID
    const taka = await Taka.findOne({
      companyId: user.companyId,
      $or: [
        { takaNumber: { $regex: searchValue, $options: "i" } },
        { _id: searchValue },
      ],
    })
      .populate("fabric", "itemName itemCode category")
      .populate("shade", "name code hexCode")
      .populate("warehouse", "name location")
      .populate("productionOrder", "orderNumber")
      .populate("lot", "lotNumber");

    if (!taka) {
      return NextResponse.json(
        { success: false, message: "Taka not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: taka });
  } catch (err) {
    console.error("Scan error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
