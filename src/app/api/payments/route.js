import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Payment from "@/models/Payment";
import SalesInvoice from "@/models/SalesInvoice";
import PurchaseInvoice from "@/models/InvoiceModel";
import AccountHead from "@/models/accounts/AccountHead";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { autoPaymentReceipt, autoPaymentPaid } from "@/lib/autoTransaction";

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized");
    const user = verifyJWT(token);
    if (!user?.companyId) throw new Error("Invalid token");

    const { type, date, amount, bankAccountId, partyType, partyId, partyName,
      paymentMode, narration, chequeNumber, utrNumber, appliedInvoices = [] } = await req.json();
    const errors = [];
    if (!['Payment', 'Receipt'].includes(type)) errors.push("Valid type (Payment/Receipt) required");
    if (!(Number(amount) > 0)) errors.push("Amount must be a positive number");
    if (!mongoose.Types.ObjectId.isValid(bankAccountId)) errors.push("Valid bankAccountId required");
    if (!['Supplier', 'Customer'].includes(partyType)) errors.push("Valid partyType (Supplier/Customer) required");
    if (!mongoose.Types.ObjectId.isValid(partyId)) errors.push("Valid partyId required");
    if (!Array.isArray(appliedInvoices) || appliedInvoices.length === 0) errors.push("At least one invoice must be selected");
    if (type === 'Payment' && partyType !== 'Supplier') errors.push("Payments are for suppliers");
    if (type === 'Receipt' && partyType !== 'Customer') errors.push("Receipts are for customers");
    for (const item of appliedInvoices) {
      if (!mongoose.Types.ObjectId.isValid(item.invoiceId) || !(Number(item.amount) > 0)) errors.push("Each applied invoice needs a valid id and positive amount");
    }
    if (errors.length) throw new Error(errors.join('; '));

    const paymentAmount = roundMoney(amount);
    const allocatedAmount = roundMoney(appliedInvoices.reduce((sum, item) => sum + Number(item.amount || 0), 0));
    if (Math.abs(paymentAmount - allocatedAmount) > 0.009) throw new Error("Payment amount must equal the total allocated to invoices");
    if (new Set(appliedInvoices.map((item) => String(item.invoiceId))).size !== appliedInvoices.length) throw new Error("An invoice can be allocated only once in a payment");

    let savedPayment;
    await session.withTransaction(async () => {
      const bankAccount = await AccountHead.findOne({ _id: bankAccountId, companyId: user.companyId, type: 'Asset', isActive: true }).session(session);
      if (!bankAccount) throw new Error("Selected cash/bank account is unavailable");

      const InvoiceModel = partyType === 'Supplier' ? PurchaseInvoice : SalesInvoice;
      const preparedInvoices = [];
      for (const item of appliedInvoices) {
        const invoice = await InvoiceModel.findOne({ _id: item.invoiceId, companyId: user.companyId }).session(session);
        if (!invoice) throw new Error(`Invoice ${item.invoiceId} not found`);
        const invoicePartyId = partyType === 'Supplier' ? invoice.supplier : invoice.customer;
        if (String(invoicePartyId) !== String(partyId)) throw new Error(`Invoice ${item.invoiceId} belongs to another party`);
        if ((partyType === 'Supplier' && invoice.status !== 'posted') || (partyType === 'Customer' && invoice.status === 'Cancelled')) {
          throw new Error(`Invoice ${item.invoiceId} is not available for payment`);
        }
        const newPaid = roundMoney(Number(invoice.paidAmount || 0) + Number(item.amount));
        const total = roundMoney(invoice.grandTotal);
        if (newPaid - total > 0.009) throw new Error(`Payment exceeds invoice total for ${invoice.invoiceNumber || invoice.documentNumberPurchaseInvoice}`);
        preparedInvoices.push({ invoice, amount: roundMoney(item.amount), total, newPaid });
      }

      const [payment] = await Payment.create([{
        companyId: user.companyId, createdBy: user.id || user.userId, type,
        paymentDate: date ? new Date(date) : new Date(), amount: paymentAmount, bankAccountId,
        partyType, partyId, partyName: partyName || '', paymentMode: paymentMode || 'Bank Transfer',
        narration: narration || '', chequeNumber: chequeNumber || null, utrNumber: utrNumber || null,
        appliedInvoices: preparedInvoices.map(({ invoice, amount: applied }) => ({
          invoiceId: invoice._id, invoiceNumber: invoice.invoiceNumber || invoice.documentNumberPurchaseInvoice || '', amount: applied,
        })),
      }], { session });

      for (const { invoice, total, newPaid } of preparedInvoices) {
        invoice.paidAmount = newPaid;
        invoice.remainingAmount = Math.max(roundMoney(total - newPaid), 0);
        invoice.paymentStatus = invoice.remainingAmount === 0 ? 'Paid' : 'Partial';
        await invoice.save({ session });
      }

      const accountingInput = {
        companyId: user.companyId, amount: paymentAmount, partyId, partyName: partyName || '',
        referenceId: payment._id, referenceNumber: payment.paymentNumber,
        narration: narration || `${type} ${payment.paymentNumber}`, date: payment.paymentDate,
        createdBy: user.id || user.userId, paymentMode: payment.paymentMode,
        bankAccountId: bankAccount._id, bankAccountName: bankAccount.name,
        chequeNumber: chequeNumber || undefined, utrNumber: utrNumber || undefined, session,
      };
      if (partyType === 'Customer') await autoPaymentReceipt(accountingInput);
      else await autoPaymentPaid(accountingInput);
      savedPayment = payment;
    });

    return NextResponse.json({ success: true, data: savedPayment }, { status: 201 });
  } catch (error) {
    console.error('Payment POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  } finally {
    await session.endSession();
  }
}
