import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import SalesOrderProduction from "@/models/textiles/SalesOrderProduction";
import SalesOrder from "@/models/SalesOrder";
import ProductionOrder from "@/models/ppc/ProductionOrder";

// GET: List all integrated sales orders
export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const filter = { companyId: user.companyId };

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { "salesOrder.orderNumber": { $regex: search, $options: "i" } },
        { "salesOrder.customer.name": { $regex: search, $options: "i" } },
      ];
    }

    const records = await SalesOrderProduction.find(filter)
      .populate("salesOrder", "documentNumberOrder customer customerName grandTotal status items expectedDeliveryDate")
      .populate("productionOrder", "orderNumber status")
      .populate("createdBy", "name")
      .sort({ priority: -1, deliveryDate: 1 });

    return NextResponse.json({ success: true, data: records });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST: Create new integration record
export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate sales order exists
    const salesOrder = await SalesOrder.findOne({ _id: body.salesOrder, companyId: user.companyId });
    if (!salesOrder) {
      return NextResponse.json({ success: false, message: "Sales Order not found" }, { status: 404 });
    }

    // Check if already integrated
    const existing = await SalesOrderProduction.findOne({ salesOrder: body.salesOrder, companyId: user.companyId });
    if (existing) {
      return NextResponse.json({ success: false, message: "Sales Order already integrated" }, { status: 400 });
    }

    // Create integration record
    const record = new SalesOrderProduction({
      ...body,
      companyId: user.companyId,
      createdBy: user.id,
      customer: body.customer || salesOrder.customer,
      plannedQuantity: body.plannedQuantity || salesOrder.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      balanceQuantity: body.plannedQuantity || salesOrder.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      deliveryDate: body.deliveryDate || salesOrder.expectedDeliveryDate,
    });
    await record.save();

    return NextResponse.json({ success: true, data: record });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
