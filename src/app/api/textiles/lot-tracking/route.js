// app/api/textiles/lot-tracking/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Lot from "@/models/textiles/Lot";
import LotAssignment from "@/models/textiles/LotAssignment";
import ShadeCard from "@/models/textiles/ShadeCard"; // ✅ IMPORTANT: registers the model
import Supplier from "@/models/SupplierModels";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const filter = { companyId: user.companyId };
    if (search) {
      filter.$or = [
        { lotNumber: { $regex: search, $options: "i" } },
        { "product.itemName": { $regex: search, $options: "i" } },
      ];
    }
    const lots = await Lot.find(filter)
      .populate("product", "itemName itemCode")
      .populate("shade", "name code")
      .populate("supplier", "supplierName")  // ← correct field name
      .populate("purchaseOrder", "documentNumberPurchaseOrder") // optional
      .sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: lots });
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
    const lot = new Lot({ ...body, companyId: user.companyId });
    await lot.save();
    return NextResponse.json({ success: true, data: lot });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}