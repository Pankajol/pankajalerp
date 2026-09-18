import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import PurchaseInvoice from "@/models/InvoiceModel";
import SalesInvoice from "@/models/SalesInvoice";
import Transaction from "@/models/accounts/Transaction";
import { autoPurchaseInvoice, autoPaymentEntry, autoSalesInvoice, autoPaymentReceipt } from "@/lib/autoTransaction";

const paymentFallback = (method) => method === "cash" ? "Cash in Hand" : ["upi", "card", "netbanking", "wallet"].includes(method) ? "Digital Payments" : "Bank Account";

async function reconcilePurchase(invoice, user, session) {
  const reference = invoice._id;
  const posted = await Transaction.exists({ companyId: user.companyId, type: "Purchase Invoice", referenceId: reference, status: "Posted" }).session(session);
  if (!posted) await autoPurchaseInvoice({ companyId: user.companyId, amount: invoice.grandTotal, taxAmount: invoice.gstTotal, fromGRN: Boolean(invoice.grn), partyId: invoice.supplier, partyName: invoice.supplierName || "Supplier", referenceId: reference, referenceNumber: invoice.documentNumberPurchaseInvoice, date: invoice.postingDate, createdBy: user.id || user.userId, session });
  for (const payment of invoice.payments || []) {
    if (!(Number(payment.amount) > 0)) continue;
    if (!payment.paymentId) payment.paymentId = new mongoose.Types.ObjectId();
    const done = await Transaction.exists({ companyId: user.companyId, type: "Payment", referenceId: payment.paymentId, status: "Posted" }).session(session);
    if (!done) await autoPaymentEntry({ companyId: user.companyId, amount: payment.amount, partyId: invoice.supplier, partyName: invoice.supplierName || "Supplier", referenceId: payment.paymentId, referenceNumber: invoice.documentNumberPurchaseInvoice, bankAccountId: payment.bankAccountId || undefined, bankAccountName: paymentFallback(payment.method), paymentMode: payment.method, date: payment.paymentDate || invoice.postingDate, createdBy: user.id || user.userId, session });
  }
  await invoice.save({ session });
}

async function reconcileSales(invoice, user, session) {
  const reference = invoice._id;
  const posted = await Transaction.exists({ companyId: user.companyId, type: "Sales Invoice", referenceId: reference, status: "Posted" }).session(session);
  if (!posted) await autoSalesInvoice({ companyId: user.companyId, amount: invoice.grandTotal, taxAmount: invoice.gstTotal, partyId: invoice.customer, partyName: invoice.customerName || "Customer", referenceId: reference, referenceNumber: invoice.invoiceNumber, date: invoice.invoiceDate, createdBy: user.id || user.userId, session });
  for (const payment of invoice.payments || []) {
    if (!(Number(payment.amount) > 0)) continue;
    if (!payment.paymentId) payment.paymentId = new mongoose.Types.ObjectId();
    const done = await Transaction.exists({ companyId: user.companyId, type: "Receipt", referenceId: payment.paymentId, status: "Posted" }).session(session);
    if (!done) await autoPaymentReceipt({ companyId: user.companyId, amount: payment.amount, partyId: invoice.customer, partyName: invoice.customerName || "Customer", referenceId: payment.paymentId, referenceNumber: invoice.invoiceNumber, bankAccountId: payment.bankAccountId || undefined, bankAccountName: paymentFallback(payment.method), paymentMode: payment.method, date: payment.paymentDate || invoice.invoiceDate, createdBy: user.id || user.userId, session });
  }
  await invoice.save({ session });
}

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const [purchaseInvoices, salesInvoices] = await Promise.all([
      PurchaseInvoice.countDocuments({ companyId: user.companyId, status: "posted" }),
      SalesInvoice.countDocuments({ companyId: user.companyId, status: { $ne: "Cancelled" } }),
    ]);
    const [purchaseTransactions, salesTransactions] = await Promise.all([
      Transaction.countDocuments({ companyId: user.companyId, type: "Purchase Invoice", status: "Posted" }),
      Transaction.countDocuments({ companyId: user.companyId, type: "Sales Invoice", status: "Posted" }),
    ]);
    return NextResponse.json({ success: true, summary: { purchaseInvoices, salesInvoices, purchaseTransactions, salesTransactions, missingPurchase: Math.max(0, purchaseInvoices - purchaseTransactions), missingSales: Math.max(0, salesInvoices - salesTransactions) } });
  } catch (error) { return NextResponse.json({ success: false, message: error.message }, { status: 500 }); }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "Accounts", "create") && !hasPermission(user, "Accounts", "edit")) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    const { type = "all" } = await req.json().catch(() => ({}));
    const result = { purchase: 0, sales: 0, errors: [] };
    if (type === "all" || type === "purchase") for (const invoice of await PurchaseInvoice.find({ companyId: user.companyId, status: "posted" })) {
      const session = await mongoose.startSession();
      try { await session.withTransaction(() => reconcilePurchase(invoice, user, session)); result.purchase += 1; } catch (error) { result.errors.push({ invoice: invoice.documentNumberPurchaseInvoice, message: error.message }); } finally { await session.endSession(); }
    }
    if (type === "all" || type === "sales") for (const invoice of await SalesInvoice.find({ companyId: user.companyId, status: { $ne: "Cancelled" } })) {
      const session = await mongoose.startSession();
      try { await session.withTransaction(() => reconcileSales(invoice, user, session)); result.sales += 1; } catch (error) { result.errors.push({ invoice: invoice.invoiceNumber, message: error.message }); } finally { await session.endSession(); }
    }
    return NextResponse.json({ success: result.errors.length === 0, result });
  } catch (error) { return NextResponse.json({ success: false, message: error.message }, { status: 500 }); }
}
