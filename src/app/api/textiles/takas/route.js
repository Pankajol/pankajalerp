import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Taka from "@/models/textiles/Taka";
import QRCode from "qrcode";
import Design from "@/models/textiles/Design";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const filter = { companyId: user.companyId };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { takaNumber: { $regex: search, $options: "i" } },
        { "fabric.itemName": { $regex: search, $options: "i" } },
      ];
    }

    const takas = await Taka.find(filter)
      .populate("productionOrder", "orderNumber")
      .populate("lot", "lotNumber")
      .populate("fabric", "itemName itemCode")
      .populate({
        path: "designRef",
        select: "designCode description qualityParameters status",
        populate: { path: "qualityParameters", select: "code name method minValue maxValue unit status" },
      })
      .populate("shade", "name code")
      .populate("warehouse", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: takas });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const design = await Design.findOne({ _id: body.designRef, companyId: user.companyId, status: "active" })
      .select("designCode")
      .lean();
    if (!design) {
      return NextResponse.json({ success: false, message: "Active design is required" }, { status: 400 });
    }

    // Generate QR code (as data URL)
    const qrData = JSON.stringify({
      takaId: body.takaNumber,
      fabric: body.fabric,
      quantity: body.quantity,
    });
    const qrCode = await QRCode.toDataURL(qrData);

    const taka = new Taka({
      ...body,
      design: design.designCode,
      companyId: user.companyId,
      qrCode,
      createdBy: user.id,
    });
    await taka.save();

    return NextResponse.json({ success: true, data: taka });
  } catch (err) {
    if (err.code === 11000) return NextResponse.json({ success: false, message: "This taka number already exists. Please use a different number." }, { status: 409 });
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
