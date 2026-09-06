import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import GRN from "@/models/grnModels";
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
    // Fetch purchase orders with their items (assuming items array has orderedQuantity)
    const poFilter = { companyId: decoded.companyId };
    if (supplier) poFilter.supplier = new mongoose.Types.ObjectId(supplier);
    if (startDate || endDate) {
      poFilter.documentDate = {};
      if (startDate) poFilter.documentDate.$gte = new Date(startDate);
      if (endDate) poFilter.documentDate.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    const orders = await PurchaseOrder.find(poFilter).lean();

    // Fetch GRNs
    const grnFilter = { companyId: decoded.companyId };
    if (supplier) grnFilter.supplier = new mongoose.Types.ObjectId(supplier);
    if (startDate || endDate) {
      grnFilter.postingDate = {};
      if (startDate) grnFilter.postingDate.$gte = new Date(startDate);
      if (endDate) grnFilter.postingDate.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    const grns = await GRN.find(grnFilter).lean();

    // Build reconciliation: match PO items to GRN items by item id
    const reconciliation = [];
    for (const po of orders) {
      for (const item of po.items || []) {
        const orderedQty = item.quantity || item.orderedQuantity || 0;
        // Find GRNs that link to this PO and contain this item
        const matchingGrns = grns.filter(g =>
          g.purchaseOrder && g.purchaseOrder.toString() === po._id.toString() &&
          (g.items || []).some(gi => gi.item.toString() === item.item.toString())
        );
        const receivedQty = matchingGrns.reduce((sum, g) => {
          const gi = g.items.find(gi => gi.item.toString() === item.item.toString());
          return sum + (gi ? gi.quantity || gi.receivedQuantity || 0 : 0);
        }, 0);
        reconciliation.push({
          poNo: po.documentNumber || po.documentNumberPurchaseOrder,
          grnNo: matchingGrns.map(g => g.documentNumberGrn).join(", ") || "—",
          orderedQty,
          receivedQty,
          pendingQty: Math.max(orderedQty - receivedQty, 0),
        });
      }
    }

    return NextResponse.json({ success: true, data: reconciliation });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}