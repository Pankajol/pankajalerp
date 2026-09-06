import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import SupplierPerformance from "@/models/textiles/SupplierPerformance";
import Supplier from "@/models/SupplierModels";
import QCInspection from "@/models/textiles/QCInspection";
import JobWorkChallan from "@/models/textiles/JobWorkChallan";
import JobWorkReceipt from "@/models/textiles/JobWorkReceipt";
import PurchaseOrder from "@/models/PurchaseOrder";

// GET: List all supplier performances
export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const supplier = searchParams.get("supplier") || "";
    const rating = searchParams.get("rating") || "";
    const filter = { companyId: user.companyId };

    if (supplier) filter.supplier = supplier;
    if (rating) filter.rating = rating;

    const performances = await SupplierPerformance.find(filter)
      .populate("supplier", "supplierName emailId mobileNumber")
      .populate("createdBy", "name")
      .sort({ periodStart: -1 });

    return NextResponse.json({ success: true, data: performances });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST: Calculate performance for a supplier
export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { supplierId, periodStart, periodEnd } = body;

    if (!supplierId) {
      return NextResponse.json({ success: false, message: "Supplier ID required" }, { status: 400 });
    }

    // Get supplier details
    const supplier = await Supplier.findOne({
      _id: supplierId,
      companyId: user.companyId,
    });
    if (!supplier) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    const start = new Date(periodStart || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const end = new Date(periodEnd || new Date());

    // 1. Quality metrics from QC Inspections
    const qcFilter = {
      companyId: user.companyId,
      inspectedDate: { $gte: start, $lte: end },
    };

    // Get all QC inspections linked to this supplier (through job work)
    const inspections = await QCInspection.find(qcFilter)
      .populate("taka", "jobWorkChallan");

    let totalInspections = 0;
    let passedInspections = 0;
    let defectCount = 0;
    const defectTypes = {};

    for (const inspection of inspections) {
      totalInspections++;
      if (inspection.finalResult === "pass") passedInspections++;
      if (inspection.defects && inspection.defects.length > 0) {
        for (const defect of inspection.defects) {
          defectCount++;
          defectTypes[defect.type] = (defectTypes[defect.type] || 0) + 1;
        }
      }
    }

    // 2. Delivery metrics from Purchase Orders
    const poFilter = {
      companyId: user.companyId,
      supplier: supplierId,
      createdAt: { $gte: start, $lte: end },
    };
    const purchaseOrders = await PurchaseOrder.find(poFilter);
    const totalOrders = purchaseOrders.length;
    let onTimeOrders = 0;
    let avgLeadTime = 0;
    let leadTimeSum = 0;

    for (const po of purchaseOrders) {
      if (po.deliveryDate && po.receivedDate) {
        const leadTime = (new Date(po.receivedDate) - new Date(po.deliveryDate)) / (1000 * 60 * 60 * 24);
        leadTimeSum += Math.abs(leadTime);
        if (new Date(po.receivedDate) <= new Date(po.deliveryDate)) {
          onTimeOrders++;
        }
      }
    }
    avgLeadTime = totalOrders > 0 ? leadTimeSum / totalOrders : 0;

    // 3. Job Work metrics (shrinkage)
    const challans = await JobWorkChallan.find({
      companyId: user.companyId,
      vendor: supplierId,
      issuedDate: { $gte: start, $lte: end },
    });

    const receiptFilter = {
      companyId: user.companyId,
      vendor: supplierId,
      receivedDate: { $gte: start, $lte: end },
    };
    const receipts = await JobWorkReceipt.find(receiptFilter);

    let totalSentQty = 0;
    let totalReceivedQty = 0;
    for (const receipt of receipts) {
      totalReceivedQty += receipt.totalReceivedQty || 0;
    }
    for (const challan of challans) {
      totalSentQty += challan.totalQuantity || 0;
    }

    const avgShrinkage = totalSentQty > 0
      ? ((totalSentQty - totalReceivedQty) / totalSentQty) * 100
      : 0;

    // 4. Cost metrics
    let totalCost = 0;
    let avgUnitCost = 0;
    // Simplified cost calculation from purchase orders
    for (const po of purchaseOrders) {
      totalCost += po.totalAmount || 0;
    }
    const totalQty = purchaseOrders.reduce((sum, po) => sum + (po.quantity || 0), 0);
    avgUnitCost = totalQty > 0 ? totalCost / totalQty : 0;

    // Calculate scores
    const qualityScore = totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 0;
    const deliveryScore = totalOrders > 0 ? (onTimeOrders / totalOrders) * 100 : 0;
    const shrinkageScore = Math.max(0, 100 - (avgShrinkage * 10));

    // Weighted overall score
    const weights = { quality: 35, delivery: 30, shrinkage: 20, cost: 15 };
    const overallScore = (
      (qualityScore * weights.quality) +
      (deliveryScore * weights.delivery) +
      (shrinkageScore * weights.shrinkage) +
      (80 * weights.cost) // default cost score
    ) / 100;

    // Rating
    let rating = "B";
    if (overallScore >= 90) rating = "A";
    else if (overallScore >= 75) rating = "B";
    else if (overallScore >= 60) rating = "C";
    else if (overallScore >= 40) rating = "D";
    else rating = "F";

    // Prepare metrics
    const metrics = [
      { metric: "quality", score: qualityScore, weight: weights.quality, details: `${passedInspections}/${totalInspections} passed` },
      { metric: "delivery", score: deliveryScore, weight: weights.delivery, details: `${onTimeOrders}/${totalOrders} on-time` },
      { metric: "shrinkage", score: shrinkageScore, weight: weights.shrinkage, details: `Avg ${avgShrinkage.toFixed(2)}%` },
      { metric: "cost", score: 80, weight: weights.cost, details: `Avg ₹${avgUnitCost.toFixed(2)}/unit` },
    ];

    const performanceData = {
      supplier: supplierId,
      periodStart: start,
      periodEnd: end,
      totalInspections,
      passedInspections,
      failedInspections: totalInspections - passedInspections,
      qualityScore,
      defectCount,
      defectTypes: new Map(Object.entries(defectTypes)),
      totalOrders,
      onTimeOrders,
      lateOrders: totalOrders - onTimeOrders,
      deliveryScore,
      avgLeadTime,
      totalSentQty,
      totalReceivedQty,
      avgShrinkage,
      shrinkageScore,
      totalCost,
      avgUnitCost,
      costScore: 80,
      overallScore,
      rating,
      metrics,
    };

    // Save if requested
    let saved = null;
    if (body.save) {
      const performance = new SupplierPerformance({
        companyId: user.companyId,
        ...performanceData,
        status: body.status || "draft",
        remarks: body.remarks || "",
        createdBy: user.id,
      });
      saved = await performance.save();
    }

    return NextResponse.json({
      success: true,
      data: {
        calculation: performanceData,
        saved,
      },
    });
  } catch (err) {
    console.error("Supplier performance error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
