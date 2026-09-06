import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import LotAssignment from "@/models/textiles/LotAssignment";
import Lot from "@/models/textiles/Lot";   
import   ShadeCard from "@/models/textiles/ShadeCard"; // ✅ IMPORTANT: registers the model
import Item from "@/models/ItemModels";
import ProductionOrder from "@/models/ProductionOrder";
import CompanyUser from "@/models/CompanyUser";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const filter = { companyId: user.companyId };   // ✅ use companyId (not company)
    if (search) {
      filter.$or = [
        { "lot.lotNumber": { $regex: search, $options: "i" } },
        { "productionOrder.orderNumber": { $regex: search, $options: "i" } },
      ];
    }
    const assignments = await LotAssignment.find(filter)
      .populate("productionOrder", "orderNumber productionDocNo")
      .populate("lot", "lotNumber product shade quantity unit")
      .populate("item", "itemName itemCode")
      .sort({ assignedAt: -1 });

    return NextResponse.json({ success: true, data: assignments });
  } catch (err) {
    console.error("GET lot-assignments error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // ✅ Validate lot exists and has enough quantity
    const lot = await Lot.findOne({ _id: body.lot, companyId: user.companyId });
    if (!lot) {
      return NextResponse.json({ success: false, message: "Lot not found" }, { status: 404 });
    }
    if (lot.quantity < body.assignedQuantity) {
      return NextResponse.json({ success: false, message: "Insufficient lot quantity" }, { status: 400 });
    }

    // Create assignment
    const assignment = new LotAssignment({
      ...body,
      companyId: user.companyId,     // ✅ use companyId
      assignedBy: user.id,
      availableQuantity: lot.quantity - body.assignedQuantity,
    });
    await assignment.save();

    // Reduce lot quantity
    lot.quantity -= body.assignedQuantity;
    await lot.save();

    return NextResponse.json({ success: true, data: assignment });
  } catch (err) {
    console.error("POST lot-assignments error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}