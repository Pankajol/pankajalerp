import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import GreigeFolding from "@/models/textiles/GreigeFolding";
import Taka from "@/models/textiles/Taka";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const filter = { company: user.companyId };

    if (search) {
      filter.$or = [
        { foldingNumber: { $regex: search, $options: "i" } },
        { "productionOrder.orderNumber": { $regex: search, $options: "i" } },
      ];
    }

    const records = await GreigeFolding.find(filter)
      .populate("productionOrder", "orderNumber item quantity unit")
      .populate("machine", "name code")
      .populate("lot", "lotNumber")
      .populate("operator", "name")
      .populate("createdBy", "name")
      .sort({ date: -1, createdAt: -1 });

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
    const ProductionOrder = await import("@/models/ppc/ProductionOrder").then((m) => m.default);
    const po = await ProductionOrder.findOne({ _id: body.productionOrder, company: user.companyId });
    if (!po) {
      return NextResponse.json({ success: false, message: "Production Order not found" }, { status: 404 });
    }

    // Create folding record
    const folding = new GreigeFolding({
      ...body,
      company: user.companyId,
      createdBy: user.id,
    });
    await folding.save();

    // If status is approved, create Takas
    if (body.status === "approved" && body.takas && body.takas.length > 0) {
      const takaPromises = body.takas.map(async (t) => {
        const takaData = {
          companyId: user.companyId,
          takaNumber: t.takaNumber,
          productionOrder: body.productionOrder,
          lot: body.lot || null,
          fabric: po.item,
          shade: null, // could be set later
          quantity: t.meters,
          weight: t.weight || 0,
          width: t.width || 0,
          status: "available",
          createdBy: user.id,
        };
        const newTaka = new Taka(takaData);
        await newTaka.save();
        return newTaka._id;
      });
      const takaIds = await Promise.all(takaPromises);
      // Optionally store takaIds in folding record if we add a field
    }

    return NextResponse.json({ success: true, data: folding });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
