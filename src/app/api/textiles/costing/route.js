import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Costing from "@/models/textiles/Costing";
import Taka from "@/models/textiles/Taka";
import TextileBOM from "@/models/textiles/TextileBOM";
import WeavingWIP from "@/models/textiles/WeavingWIP";
import JobWorkReceipt from "@/models/textiles/JobWorkReceipt";
import "@/models/textiles/Design";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const filter = { companyId: user.companyId };

    if (search) {
      filter.$or = [
        { costingNumber: { $regex: search, $options: "i" } },
        { "taka.takaNumber": { $regex: search, $options: "i" } },
      ];
    }

    const costings = await Costing.find(filter)
      .populate("taka", "takaNumber quantity fabric")
      .populate("design", "designCode description")
      .populate("productionOrder", "orderNumber")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: costings });
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
    const taka = body.taka
      ? await Taka.findOne({ _id: body.taka, companyId: user.companyId }).select("designRef")
      : null;
    if (body.taka && !taka) {
      return NextResponse.json({ success: false, message: "Taka not found" }, { status: 404 });
    }
    const costing = new Costing({
      ...body,
      design: taka?.designRef || body.design || undefined,
      companyId: user.companyId,
      createdBy: user.id,
    });
    await costing.save();

    return NextResponse.json({ success: true, data: costing });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
