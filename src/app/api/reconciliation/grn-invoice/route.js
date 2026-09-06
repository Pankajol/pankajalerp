import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
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
    // Fetch GRNs
    const grnFilter = { companyId: decoded.companyId };
    if (supplier) grnFilter.supplier = new mongoose.Types.ObjectId(supplier);
    if (startDate || endDate) {
      grnFilter.postingDate = {};
      if (startDate) grnFilter.postingDate.$gte = new Date(startDate);
      if (endDate) grnFilter.postingDate.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    const grns = await GRN.find(grnFilter).lean();

    // Fetch invoices
    const invFilter = { companyId: decoded.companyId };
    if (supplier) invFilter.supplier = new mongoose.Types.ObjectId(supplier);
    if (startDate || endDate) {
      invFilter.documentDate = {};
      if (startDate) invFilter.documentDate.$gte = new Date(startDate);
      if (endDate) invFilter.documentDate.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    const invoices = await PurchaseInvoice.find(invFilter).lean();

    const reconciliation = [];
    for (const grn of grns) {
      const linkedInvoices = invoices.filter(inv => inv.grn && inv.grn.toString() === grn._id.toString());
      const grnQty = grn.items?.reduce((sum, it) => sum + (it.quantity || it.receivedQuantity || 0), 0) || 0;
      const billedQty = linkedInvoices.reduce((sum, inv) => {
        return sum + (inv.items || []).reduce((s, item) => s + (item.quantity || 0), 0);
      }, 0);
      reconciliation.push({
        grnNo: grn.documentNumberGrn,
        invoiceNo: linkedInvoices.map(inv => inv.documentNumberPurchaseInvoice).join(", ") || "—",
        receivedQty: grnQty,
        billedQty,
        pendingQty: Math.max(grnQty - billedQty, 0),
      });
    }

    return NextResponse.json({ success: true, data: reconciliation });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}