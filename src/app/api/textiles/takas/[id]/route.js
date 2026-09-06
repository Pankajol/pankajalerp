import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Taka from "@/models/textiles/Taka";
import Design from "@/models/textiles/Design";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const taka = await Taka.findOne({ _id: id, companyId: user.companyId })
      .populate("productionOrder", "productionDocNo orderNumber")
      .populate("lot", "lotNumber")
      .populate("fabric", "itemName itemCode")
      .populate({
        path: "designRef",
        select: "designCode description qualityParameters status",
        populate: { path: "qualityParameters", select: "code name method minValue maxValue unit status" },
      })
      .populate("shade", "name code")
      .populate("warehouse", "warehouseName warehouseCode name");

    if (!taka) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: taka });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    delete body.companyId;
    delete body.createdBy;
    const design = await Design.findOne({ _id: body.designRef, companyId: user.companyId })
      .select("designCode")
      .lean();
    if (!design) return NextResponse.json({ success: false, message: "Design not found" }, { status: 400 });
    body.design = design.designCode;
    const taka = await Taka.findOneAndUpdate(
      { _id: (await params).id, companyId: user.companyId },
      body,
      { new: true, runValidators: true }
    );
    if (!taka) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: taka });
  } catch (err) {
    if (err.code === 11000) return NextResponse.json({ success: false, message: "This taka number already exists. Please use a different number." }, { status: 409 });
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const taka = await Taka.findOneAndDelete({ _id: (await params).id, companyId: user.companyId });
    if (!taka) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
