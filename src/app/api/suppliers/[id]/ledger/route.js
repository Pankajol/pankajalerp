import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Transaction from "@/models/accounts/Transaction";
import Supplier from "@/models/SupplierModels";
import mongoose from "mongoose";

export async function GET(req, { params }) {
  try {
    await connectDB();
    
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    
    const user = verifyJWT(token);
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const fiscalYear = searchParams.get("fiscalYear");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    // Validate supplier ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid supplier ID" }, { status: 400 });
    }

    const supplier = await Supplier.findOne({ _id: id, companyId: user.companyId }).select("supplierName glAccount");
    if (!supplier?.glAccount) {
      return NextResponse.json({ success: false, message: "Supplier ledger account is not configured" }, { status: 404 });
    }

    const query = {
      companyId: user.companyId,
      partyType: "Supplier",
      partyId: new mongoose.Types.ObjectId(id),
      status: "Posted",
    };

    if (fiscalYear) query.fiscalYear = fiscalYear;
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate);
      if (toDate) query.date.$lte = new Date(toDate + "T23:59:59");
    }

    const transactions = await Transaction.find(query)
      .populate("lines.accountId", "name code type")
      .sort({ date: 1, createdAt: 1 });

    // Calculate running balance
    let runningBalance = 0;
    const entries = [];

    for (const txn of transactions) {
      const partyLines = txn.lines.filter((line) => String(line.accountId?._id || line.accountId) === String(supplier.glAccount));
      const txnDebit = partyLines.filter((line) => line.type === "Debit").reduce((sum, line) => sum + line.amount, 0);
      const txnCredit = partyLines.filter((line) => line.type === "Credit").reduce((sum, line) => sum + line.amount, 0);
      // Supplier account is credit-normal: purchases increase the payable,
      // payments and debit notes reduce it.
      runningBalance += txnCredit - txnDebit;

      entries.push({
        _id: txn._id,
        date: txn.date,
        transactionNumber: txn.transactionNumber,
        transactionType: txn.type,
        narration: txn.narration,
        debit: txnDebit,
        credit: txnCredit,
        balance: runningBalance,
      });
    }

    return NextResponse.json({ success: true, supplier: supplier.supplierName, entries, closingBalance: runningBalance });
  } catch (error) {
    console.error("Supplier ledger error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
