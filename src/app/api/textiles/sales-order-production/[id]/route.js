import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import SalesOrderProduction from "@/models/textiles/SalesOrderProduction";
import "@/models/ppc/ProductionOrder";

const getUser = (req) => verifyJWT(getTokenFromHeader(req));

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const record = await SalesOrderProduction.findOne({ _id: id, companyId: user.companyId })
      .populate("salesOrder", "documentNumberOrder customer customerName status items expectedDeliveryDate")
      .populate("productionOrder", "orderNumber itemCode itemName quantity status")
      .populate("plant", "warehouseCode warehouseName")
      .populate("customer", "customerName name email")
      .populate("createdBy", "name");
    if (!record) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const record = await SalesOrderProduction.findOne({ _id: id, companyId: user.companyId });
    if (!record) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    if (record.productionOrder) {
      return NextResponse.json(
        { success: false, message: "Cannot delete an integration after its production order has been created" },
        { status: 409 }
      );
    }
    await record.deleteOne();
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
