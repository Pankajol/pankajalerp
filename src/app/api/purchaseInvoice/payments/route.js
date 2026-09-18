import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import PurchaseInvoice from "@/models/InvoiceModel";
import Payment from "@/models/Payment";
import AccountHead from "@/models/accounts/AccountHead";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { autoPaymentEntry } from "@/lib/autoTransaction";

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;
const modeMap = { cash: "Cash", bank: "Bank Transfer", netbanking: "Bank Transfer", upi: "UPI", card: "Card", cheque: "Cheque", wallet: "Other" };
const fallbackAccount = (method) => method === "cash" ? ["Cash in Hand", "Cash"] : ["upi", "card", "netbanking", "wallet"].includes(method) ? ["Digital Payments", "Current Asset"] : ["Bank Account", "Bank Account"];

async function resolvePaymentAccount(companyId, bankAccountId, method, session) {
  if (bankAccountId) {
    const account = await AccountHead.findOne({ _id: bankAccountId, companyId, type: "Asset", isActive: true }).session(session);
    if (!account) throw new Error("Selected cash/bank account is unavailable");
    return account;
  }
  const [name, group] = fallbackAccount(method);
  return AccountHead.findOneAndUpdate(
    { companyId, name },
    { $setOnInsert: { companyId, name, type: "Asset", group, balanceType: "Debit", isActive: true, isSystemAccount: true } },
    { upsert: true, new: true, session }
  );
}

export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  try {
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const user = verifyJWT(token);
    if (!user?.companyId) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 });

    const { invoiceId, amount, paymentDate, paymentMethod = "bank", bankAccountId, referenceNo, remarks } = await req.json();
    if (!mongoose.Types.ObjectId.isValid(invoiceId) || !(Number(amount) > 0)) {
      return NextResponse.json({ success: false, error: "Valid invoice and positive payment amount are required" }, { status: 400 });
    }
    const method = String(paymentMethod).toLowerCase();
    if (!Object.hasOwn(modeMap, method)) return NextResponse.json({ success: false, error: "Unsupported payment method" }, { status: 400 });

    let result;
    await session.withTransaction(async () => {
      const invoice = await PurchaseInvoice.findOne({ _id: invoiceId, companyId: user.companyId }).session(session);
      if (!invoice) throw new Error("Invoice not found");
      if (invoice.status !== "posted") throw new Error("Only posted purchase invoices can be paid");

      const paymentAmount = roundMoney(amount);
      const outstanding = roundMoney(invoice.remainingAmount ?? (Number(invoice.grandTotal || 0) - Number(invoice.paidAmount || 0)));
      if (paymentAmount - outstanding > 0.009) throw new Error("Payment amount exceeds the outstanding invoice balance");
      const account = await resolvePaymentAccount(user.companyId, bankAccountId, method, session);
      const [payment] = await Payment.create([{
        companyId: user.companyId,
        createdBy: user.id || user.userId,
        type: "Payment",
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        amount: paymentAmount,
        bankAccountId: account._id,
        partyType: "Supplier",
        partyId: invoice.supplier,
        partyName: invoice.supplierName || "Supplier",
        paymentMode: modeMap[method],
        narration: remarks || `Payment against ${invoice.documentNumberPurchaseInvoice}`,
        chequeNumber: method === "cheque" ? referenceNo || null : null,
        utrNumber: method !== "cheque" ? referenceNo || null : null,
        appliedInvoices: [{ invoiceId: invoice._id, invoiceNumber: invoice.documentNumberPurchaseInvoice, amount: paymentAmount }],
      }], { session });

      invoice.payments.push({
        paymentId: payment._id, amount: paymentAmount, method, bankAccountId: account._id,
        referenceNumber: referenceNo || null, paymentDate: payment.paymentDate, notes: remarks || null,
        ...(method === "cheque" ? { chequeNumber: referenceNo || null } : { transactionId: referenceNo || null }),
      });
      invoice.paidAmount = roundMoney(Number(invoice.paidAmount || 0) + paymentAmount);
      invoice.remainingAmount = Math.max(roundMoney(Number(invoice.grandTotal || 0) - invoice.paidAmount), 0);
      invoice.paymentStatus = invoice.remainingAmount === 0 ? "Paid" : "Partial";
      await invoice.save({ session });

      await autoPaymentEntry({
        companyId: user.companyId, amount: paymentAmount, partyId: invoice.supplier,
        partyName: invoice.supplierName || "Supplier", referenceId: payment._id,
        referenceNumber: payment.paymentNumber, narration: payment.narration,
        date: payment.paymentDate, createdBy: user.id || user.userId, paymentMode: method,
        bankAccountId: account._id, bankAccountName: account.name,
        chequeNumber: payment.chequeNumber || undefined, utrNumber: payment.utrNumber || undefined, session,
      });
      result = { payment, invoice };
    });

    return NextResponse.json({ success: true, message: "Payment recorded and posted to the ledger", data: {
      payment: result.payment,
      invoiceId: result.invoice._id, paidAmount: result.invoice.paidAmount,
      remainingAmount: result.invoice.remainingAmount, paymentStatus: result.invoice.paymentStatus,
    } }, { status: 201 });
  } catch (error) {
    console.error("Purchase payment posting failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  } finally {
    await session.endSession();
  }
}

export async function GET(req) {
  try {
    await dbConnect();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user?.companyId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const invoiceId = new URL(req.url).searchParams.get("invoiceId");
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) return NextResponse.json({ success: false, error: "invoiceId required" }, { status: 400 });
    const payments = await Payment.find({ companyId: user.companyId, type: "Payment", "appliedInvoices.invoiceId": invoiceId }).sort({ paymentDate: -1 });
    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
