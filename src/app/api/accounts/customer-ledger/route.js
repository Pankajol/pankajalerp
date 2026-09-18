import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/CustomerModel";
import LedgerEntry from "@/models/accounts/LedgerEntry";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// Customer statement / receivable sub-ledger. The linked GL account is used
// so historical postings created before partyId was added remain visible.
export async function GET(req) {
  try {
    await dbConnect();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const customerId = new URL(req.url).searchParams.get("customerId");
    const customer = await Customer.findOne({ _id: customerId, companyId: user.companyId }).populate("glAccount", "openingBalance");
    if (!customer?.glAccount) return NextResponse.json({ success: false, message: "Customer account is not linked" }, { status: 404 });
    const entries = await LedgerEntry.find({ companyId: user.companyId, accountId: customer.glAccount._id }).sort({ date: 1, createdAt: 1 });
    let balance = Number(customer.glAccount.openingBalance || 0);
    const data = entries.map((entry) => {
      balance += (entry.debit || 0) - (entry.credit || 0);
      return { date: entry.date, transactionNumber: entry.transactionNumber, narration: entry.narration, debit: entry.debit, credit: entry.credit, balance };
    });
    return NextResponse.json({ success: true, customer: customer.customerName, data, closingBalance: balance });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
