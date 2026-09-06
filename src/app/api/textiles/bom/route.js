// app/api/textiles/bom/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import TextileBOM from "@/models/textiles/TextileBOM";
import Design from "@/models/textiles/Design";

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
        { bomCode: { $regex: search, $options: "i" } },
        { "product.itemName": { $regex: search, $options: "i" } },
      ];
    }

    const boms = await TextileBOM.find(filter)
      .populate("product", "itemName itemCode")
      .populate("design", "designCode description status")
      .populate("shade", "name code")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: boms });
  } catch (err) {
    console.error("BOM GET error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.design || !(await Design.exists({ _id: body.design, companyId: user.companyId, status: "active" }))) {
      return NextResponse.json({ success: false, message: "Active design is required" }, { status: 400 });
    }
    const newBOM = new TextileBOM({
      ...body,
      companyId: user.companyId,
    });
    await newBOM.save();
    return NextResponse.json({ success: true, data: newBOM });
  } catch (err) {
    console.error("BOM POST error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
