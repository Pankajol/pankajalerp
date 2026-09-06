import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import JobWorkChallan from "@/models/textiles/JobWorkChallan";
import JobWorkReceipt from "@/models/textiles/JobWorkReceipt";
import Supplier from "@/models/SupplierModels";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get("vendorId") || "";
    const search = searchParams.get("search")?.trim() || "";

    // Build match filter
    const matchFilter = { companyId: new mongoose.Types.ObjectId(user.companyId) };
    if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
      matchFilter.vendor = new mongoose.Types.ObjectId(vendorId);
    }

    // Aggregate challans by vendor
    const challanAgg = await JobWorkChallan.aggregate([
      { $match: { ...matchFilter, status: { $in: ["issued", "partial", "completed"] } } },
      { $group: {
        _id: "$vendor",
        totalSent: { $sum: "$totalQuantity" },
        challanCount: { $sum: 1 },
        lastIssuedDate: { $max: "$issuedDate" },
        vendors: { $addToSet: "$vendor" },
      }},
    ]);

    // Aggregate receipts by vendor
    const receiptAgg = await JobWorkReceipt.aggregate([
      { $match: { ...matchFilter, status: { $in: ["received", "qc"] } } },
      { $group: {
        _id: "$vendor",
        totalReceived: { $sum: "$totalReceivedQty" },
        receiptCount: { $sum: 1 },
        totalShrinkage: { $sum: "$commercialShrinkageMeter" },
        avgShrinkage: { $avg: "$commercialShrinkagePercent" },
      }},
    ]);

    // Combine data
    const vendorMap = new Map();

    // Process challans
    for (const c of challanAgg) {
      const vendor = await Supplier.findOne({ _id: c._id, companyId: user.companyId })
        .select("supplierName emailId mobileNumber");
      if (!vendor) continue;
      vendorMap.set(c._id.toString(), {
        _id: c._id,
        vendorName: vendor.supplierName,
        vendorEmail: vendor.emailId,
        vendorPhone: vendor.mobileNumber,
        totalSent: c.totalSent || 0,
        challanCount: c.challanCount || 0,
        lastIssuedDate: c.lastIssuedDate,
        totalReceived: 0,
        receiptCount: 0,
        totalShrinkage: 0,
        avgShrinkage: 0,
        pending: c.totalSent || 0,
        overdueDays: 0,
      });
    }

    // Process receipts
    for (const r of receiptAgg) {
      const vendor = await Supplier.findOne({ _id: r._id, companyId: user.companyId }).select("supplierName");
      if (!vendor) continue;
      if (vendorMap.has(r._id.toString())) {
        const existing = vendorMap.get(r._id.toString());
        existing.totalReceived = r.totalReceived || 0;
        existing.receiptCount = r.receiptCount || 0;
        existing.totalShrinkage = r.totalShrinkage || 0;
        existing.avgShrinkage = r.avgShrinkage || 0;
        existing.pending = Math.max(0, (existing.totalSent || 0) - (r.totalReceived || 0));
        // Calculate overdue days (if last issued > 30 days and pending > 0)
        if (existing.pending > 0 && existing.lastIssuedDate) {
          const daysSinceIssue = Math.floor((Date.now() - new Date(existing.lastIssuedDate)) / (1000 * 60 * 60 * 24));
          existing.overdueDays = daysSinceIssue > 30 ? daysSinceIssue : 0;
        }
        vendorMap.set(r._id.toString(), existing);
      } else {
        // Vendor has only receipts (should not happen normally)
        vendorMap.set(r._id.toString(), {
          _id: r._id,
          vendorName: vendor.supplierName,
          totalSent: 0,
          challanCount: 0,
          totalReceived: r.totalReceived || 0,
          receiptCount: r.receiptCount || 0,
          totalShrinkage: r.totalShrinkage || 0,
          avgShrinkage: r.avgShrinkage || 0,
          pending: 0,
          overdueDays: 0,
        });
      }
    }

    // Convert map to array and sort by pending (highest first)
    const result = Array.from(vendorMap.values())
      .filter((vendor) => !search || vendor.vendorName?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.pending - a.pending)
      .map(v => ({
        ...v,
        // Ensure numeric values are numbers
        totalSent: Number(v.totalSent) || 0,
        totalReceived: Number(v.totalReceived) || 0,
        pending: Number(v.pending) || 0,
        avgShrinkage: Number(v.avgShrinkage) || 0,
        overdueDays: Number(v.overdueDays) || 0,
      }));

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("Vendor stock error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
