import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import PurchaseInvoice from "@/models/InvoiceModel";
import Payment from "@/models/Payment"; // make sure this model exists
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
    // Fetch invoices
    const invFilter = { companyId: decoded.companyId };
    if (supplier) invFilter.supplier = new mongoose.Types.ObjectId(supplier);
    if (startDate || endDate) {
      invFilter.documentDate = {};
      if (startDate) invFilter.documentDate.$gte = new Date(startDate);
      if (endDate) invFilter.documentDate.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    const invoices = await PurchaseInvoice.find(invFilter).lean();

    // Fetch payments
    const payFilter = { companyId: decoded.companyId };
    if (supplier) payFilter.supplier = new mongoose.Types.ObjectId(supplier);
    if (startDate || endDate) {
      payFilter.paymentDate = {};
      if (startDate) payFilter.paymentDate.$gte = new Date(startDate);
      if (endDate) payFilter.paymentDate.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    const payments = await Payment.find(payFilter).lean();

    const reconciliation = [];
    for (const inv of invoices) {
      const relatedPayments = payments.filter(p =>
        p.invoiceId && p.invoiceId.toString() === inv._id.toString()
      );
      const totalPaid = relatedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      reconciliation.push({
        invoiceNo: inv.documentNumberPurchaseInvoice,
        paymentNo: relatedPayments.map(p => p.paymentNo || p._id).join(", ") || "—",
        invoiceAmount: inv.grandTotal || 0,
        paidAmount: totalPaid,
        balance: (inv.grandTotal || 0) - totalPaid,
      });
    }

    return NextResponse.json({ success: true, data: reconciliation });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}