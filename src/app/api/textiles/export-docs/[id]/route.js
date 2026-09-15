import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import ExportDocumentation from "@/models/textiles/ExportDocumentation";
import "@/models/ppc/ProductionOrder";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const document = await ExportDocumentation.findOne({ _id: id, companyId: user.companyId })
      .populate("customer", "customerName name email")
      .populate("salesOrder", "documentNumberOrder status")
      .populate("productionOrder", "orderNumber itemCode itemName status")
      .populate("takas", "takaNumber quantity fabric status")
      .populate("createdBy", "name");
    if (!document) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: document });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const document = await ExportDocumentation.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!document) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
