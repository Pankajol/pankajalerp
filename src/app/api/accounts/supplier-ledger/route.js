import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Supplier from "@/models/SupplierModels";
import LedgerEntry from "@/models/accounts/LedgerEntry";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();

  const user = verifyJWT(getTokenFromHeader(req));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get("supplierId");

  // ✅ 1. supplier find
  const supplier = await Supplier.findOne({ _id: supplierId, companyId: user.companyId });
  if (!supplier || !supplier.glAccount) {
    return NextResponse.json({
      success: false,
      message: "Supplier account not linked",
    });
  }

  // ✅ 2. ledger fetch
  const entries = await LedgerEntry.find({
    accountId: supplier.glAccount,
    companyId: user.companyId,
  }).sort({ date: 1 });

  // ✅ 3. running balance
  let balance = Number(supplier.glAccount?.openingBalance || 0);
  const data = entries.map(e => {
    // Supplier accounts are credit-normal: credits increase the amount owed.
    balance += (e.credit || 0) - (e.debit || 0);
    return {
      date: e.date,
      narration: e.narration,
      debit: e.debit,
      credit: e.credit,
      balance,
    };
  });

  return NextResponse.json({
    success: true,
    supplier: supplier.supplierName,
    data,
    closingBalance: balance,
  });
}
