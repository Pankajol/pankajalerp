import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import JobWorkChallan from "@/models/textiles/JobWorkChallan";
import JobWorkReceipt from "@/models/textiles/JobWorkReceipt";

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { challanId, ...receiptData } = body;

    if (!challanId) {
      return NextResponse.json(
        { success: false, message: "challanId is required" },
        { status: 400 }
      );
    }

    // Fetch the challan
    const challan = await JobWorkChallan.findOne({
      _id: challanId,
      companyId: user.companyId,
      status: "issued",
    });
    if (!challan) {
      return NextResponse.json(
        { success: false, message: "Issued challan not found" },
        { status: 404 }
      );
    }

    // Build receipt items from challan items
    const items = challan.items.map((item) => ({
      taka: item.taka,
      challanQuantity: item.quantity,
      receivedQuantity: 0,
      actualMeters: 0,
    }));

    const receipt = new JobWorkReceipt({
      ...receiptData,
      challan: challan._id,
      vendor: challan.vendor,
      fromWarehouse: challan.fromWarehouse,
      toWarehouse: receiptData.toWarehouse || challan.toWarehouse,
      items,
      companyId: user.companyId,
      receiptNumber: undefined,
      receivedBy: user.id,
    });
    await receipt.save();

    return NextResponse.json({ success: true, data: receipt });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
