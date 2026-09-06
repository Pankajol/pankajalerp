import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import SalesOrderProduction from "@/models/textiles/SalesOrderProduction";
import ProductionOrder from "@/models/ppc/ProductionOrder";
import SalesOrder from "@/models/SalesOrder";

export async function POST(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { priority, deliveryDate, remarks } = await req.json();

    // Get the integration record
    const record = await SalesOrderProduction.findOne({ _id: id, companyId: user.companyId })
      .populate("salesOrder");

    if (!record) {
      return NextResponse.json({ success: false, message: "Record not found" }, { status: 404 });
    }

    if (record.productionOrder) {
      return NextResponse.json({ success: false, message: "Production order already created" }, { status: 400 });
    }

    // Create production order
    const salesOrder = await SalesOrder.findOne({ _id: record.salesOrder._id, company: user.companyId })
      .populate("item", "itemName itemCode");

    const po = new ProductionOrder({
      company: user.companyId,
      orderNumber: `PO-${record.salesOrder.orderNumber || Date.now()}`,
      item: salesOrder.item?._id,
      quantity: record.plannedQuantity || salesOrder.quantity,
      unit: salesOrder.unit || "Mtr",
      deliveryDate: deliveryDate || record.deliveryDate || salesOrder.deliveryDate,
      priority: priority || record.priority || 1,
      source: "sales_order",
      sourceId: record.salesOrder._id,
      status: "planned",
      createdBy: user.id,
      remarks: remarks || `Created from sales order ${record.salesOrder.orderNumber}`,
    });
    await po.save();

    // Link production order to integration record
    record.productionOrder = po._id;
    record.status = "in-progress";
    await record.save();

    return NextResponse.json({
      success: true,
      data: {
        integration: record,
        productionOrder: po,
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
