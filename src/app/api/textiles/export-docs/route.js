import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import ExportDocumentation from "@/models/textiles/ExportDocumentation";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const filter = { company: user.companyId };

    if (search) {
      filter.$or = [
        { exportNumber: { $regex: search, $options: "i" } },
        { invoiceNumber: { $regex: search, $options: "i" } },
      ];
    }
    if (status) filter.status = status;

    const docs = await ExportDocumentation.find(filter)
      .populate("customer", "name code email")
      .populate("salesOrder", "orderNumber")
      .populate("productionOrder", "orderNumber")
      .populate("takas", "takaNumber quantity fabric")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: docs });
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
    const doc = new ExportDocumentation({
      ...body,
      company: user.companyId,
      createdBy: user.id,
    });
    await doc.save();

    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}