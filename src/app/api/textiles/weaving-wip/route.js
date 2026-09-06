import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import WeavingWIP from "@/models/textiles/WeavingWIP";
import ProductionOrder from "@/models/ppc/ProductionOrder";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const machine = searchParams.get("machine") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const shift = searchParams.get("shift") || "";
    const filter = { companyId: user.companyId };

    if (machine) filter.machine = machine;
    if (shift) filter.shift = shift;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    const records = await WeavingWIP.find(filter)
      .populate("productionOrder", "orderNumber item quantity unit")
      .populate("machine", "name code")
      .populate("operator", "name")
      .populate("createdBy", "name")
      .sort({ date: -1, shift: 1 });

    return NextResponse.json({ success: true, data: records });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate production order exists
    const po = await ProductionOrder.findOne({ _id: body.productionOrder, company: user.companyId });
    if (!po) {
      return NextResponse.json({ success: false, message: "Production Order not found" }, { status: 404 });
    }

    const record = new WeavingWIP({
      ...body,
      companyId: user.companyId,
      createdBy: user.id,
    });
    await record.save();

    return NextResponse.json({ success: true, data: record });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
