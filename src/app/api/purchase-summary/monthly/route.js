import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import GRN from "@/models/grnModels";
import PurchaseInvoice from "@/models/InvoiceModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const decoded = verifyJWT(token);
  if (!decoded?.companyId) return NextResponse.json({ error: "Invalid token" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const supplier = searchParams.get("supplier");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  try {
    const baseFilter = { companyId: decoded.companyId };
    if (supplier) baseFilter.supplier = new mongoose.Types.ObjectId(supplier);

    // Date filters will be applied per model using respective date field
    const monthMap = {};

    // Helper to accumulate monthly sums
    const accumulate = (docs, field, key) => {
      docs.forEach(doc => {
        const date = doc[field];
        if (!date) return;
        const month = new Date(date).toLocaleString("en-IN", { month: "short", year: "numeric" });
        if (!monthMap[month]) monthMap[month] = { month, orders: 0, receipts: 0, invoices: 0 };
        monthMap[month][key] += doc.grandTotal || 0;
      });
    };

    // Purchase Orders
    const poFilter = { ...baseFilter };
    if (startDate || endDate) {
      poFilter.documentDate = {};
      if (startDate) poFilter.documentDate.$gte = new Date(startDate);
      if (endDate) poFilter.documentDate.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    const orders = await PurchaseOrder.find(poFilter).lean();
    accumulate(orders, "documentDate", "orders");

    // GRN
    const grnFilter = { ...baseFilter };
    if (startDate || endDate) {
      grnFilter.postingDate = {};
      if (startDate) grnFilter.postingDate.$gte = new Date(startDate);
      if (endDate) grnFilter.postingDate.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    const grns = await GRN.find(grnFilter).lean();
    accumulate(grns, "postingDate", "receipts");

    // Invoices
    const invFilter = { ...baseFilter };
    if (startDate || endDate) {
      invFilter.documentDate = {};
      if (startDate) invFilter.documentDate.$gte = new Date(startDate);
      if (endDate) invFilter.documentDate.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    const invoices = await PurchaseInvoice.find(invFilter).lean();
    accumulate(invoices, "documentDate", "invoices");

    const sortedMonths = Object.values(monthMap).sort((a, b) =>
      new Date(a.month) - new Date(b.month)
    );

    return NextResponse.json({ success: true, data: sortedMonths });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}