import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Taka from "@/models/textiles/Taka";
import Lot from "@/models/textiles/Lot";
import TextileBOM from "@/models/textiles/TextileBOM";
import Routing from "@/models/textiles/Routing";
import JobWorkChallan from "@/models/textiles/JobWorkChallan";
import JobWorkReceipt from "@/models/textiles/JobWorkReceipt";
import QCInspection from "@/models/textiles/QCInspection";
import LotAssignment from "@/models/textiles/LotAssignment";
import ProductionOrder from "@/models/ppc/ProductionOrder";
import "@/models/SupplierModels";
import "@/models/warehouseModels";
import "@/models/ItemModels";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { takaId } = params;

    // 1. Get Taka details
    const taka = await Taka.findOne({ _id: takaId, companyId: user.companyId })
      .populate("designRef", "designCode description status")
      .populate("fabric", "itemName itemCode category")
      .populate("shade", "name code hexCode")
      .populate("warehouse", "name location")
      .populate("createdBy", "name");

    if (!taka) {
      return NextResponse.json({ success: false, message: "Taka not found" }, { status: 404 });
    }

    // 2. Get Production Order
    const productionOrder = await ProductionOrder.findOne({ _id: taka.productionOrder })
      .populate("item", "itemName itemCode")
      .populate("customer", "name code");

    // 3. Get Lot details
    const lot = await Lot.findOne({ _id: taka.lot })
      .populate("product", "itemName itemCode")
      .populate("shade", "name code")
      .populate("supplier", "name email phone");

    // 4. Get Lot Assignment (if any)
    const lotAssignment = await LotAssignment.findOne({ lot: taka.lot, companyId: user.companyId })
      .populate("productionOrder", "orderNumber");

    // 5. Get BOM
    const bom = await TextileBOM.findOne({
      companyId: user.companyId,
      $or: [
        ...(taka.designRef ? [{ design: taka.designRef._id }] : []),
        { product: taka.fabric },
      ],
    })
      .populate("design", "designCode description")
      .populate("components.item", "itemName itemCode")
      .populate("shade", "name code");

    // 6. Get Routing
    const routing = await Routing.findOne({ companyId: user.companyId })
      .populate("steps");

    // 7. Get Job Work Challans for this Taka
    const challans = await JobWorkChallan.find({
      companyId: user.companyId,
      "items.taka": takaId,
    })
      .populate("vendor", "supplierName emailId mobileNumber")
      .populate("fromWarehouse", "warehouseName")
      .populate("toWarehouse", "warehouseName")
      .populate("issuedBy", "name")
      .populate("request", "requestNumber");

    // 8. Get Job Work Receipts for this Taka
    const receipts = await JobWorkReceipt.find({
      companyId: user.companyId,
      "items.taka": takaId,
    })
      .populate("vendor", "supplierName")
      .populate("fromWarehouse", "warehouseName")
      .populate("toWarehouse", "warehouseName")
      .populate("receivedBy", "name")
      .populate("challan", "challanNumber");

    // 9. Get QC Inspections for this Taka
    const inspections = await QCInspection.find({
      companyId: user.companyId,
      taka: takaId,
    })
      .populate("inspector", "name")
      .populate("approvedBy", "name")
      .populate("parameters.parameter", "name code unit");

    // 10. Build Traceability Timeline
    const timeline = [];

    // Taka Created
    timeline.push({
      stage: "Taka Created",
      date: taka.createdAt,
      icon: "📦",
      details: `Created by ${taka.createdBy?.name || "System"}`,
      status: "completed",
    });

    // Production Order
    if (productionOrder) {
      timeline.push({
        stage: "Production Order",
        date: productionOrder.createdAt,
        icon: "📋",
        details: `${productionOrder.orderNumber} – ${productionOrder.item?.itemName} (${productionOrder.quantity} ${productionOrder.unit})`,
        status: "completed",
      });
    }

    // Lot Assignment
    if (lotAssignment) {
      timeline.push({
        stage: "Lot Assignment",
        date: lotAssignment.assignedAt,
        icon: "📦",
        details: `Lot ${lot?.lotNumber} assigned to ${lotAssignment.assignedQuantity} units`,
        status: "completed",
      });
    }

    // BOM
    if (bom) {
      timeline.push({
        stage: "BOM",
        date: bom.createdAt,
        icon: "📐",
        details: `${bom.components?.length || 0} components, Waste: ${bom.wastePercent}%, Shade: ${bom.shade?.name}`,
        status: "completed",
      });
    }

    // Taka Status Changes
    if (taka.status) {
      const statusMap = {
        created: "Created",
        "in-production": "In Production",
        available: "Available",
        "job-work": "Sent for Job Work",
        received: "Received from Job Work",
        qc: "QC Inspection",
        finished: "Finished",
        dispatched: "Dispatched",
      };
      timeline.push({
        stage: "Status Update",
        date: taka.updatedAt,
        icon: "🔄",
        details: `Current status: ${statusMap[taka.status] || taka.status}`,
        status: "active",
      });
    }

    // Job Work Challans
    for (const challan of challans) {
      timeline.push({
        stage: "Job Work Challan",
        date: challan.issuedAt || challan.createdAt,
        icon: "📤",
        details: `${challan.challanNumber} - ${challan.vendor?.supplierName || "Vendor"} (${challan.items.find(i => i.taka?._id?.toString() === takaId)?.quantity || 0} Mtr)`,
        status: challan.status === "issued" ? "completed" : "pending",
        link: `/admin/textiles/job-work/challans/${challan._id}`,
      });
    }

    // Job Work Receipts
    for (const receipt of receipts) {
      timeline.push({
        stage: "Job Work Receipt",
        date: receipt.receivedDate,
        icon: "📥",
        details: `${receipt.receiptNumber} - ${receipt.vendor?.supplierName || "Vendor"} (Shrinkage: ${receipt.commercialShrinkagePercent?.toFixed(2)}%)`,
        status: "completed",
        link: `/admin/textiles/job-work/receipts/${receipt._id}`,
      });
    }

    // QC Inspections
    for (const inspection of inspections) {
      timeline.push({
        stage: "QC Inspection",
        date: inspection.inspectedDate,
        icon: "🔬",
        details: `${inspection.inspectionNumber} – Grade: ${inspection.grade}, ${inspection.finalResult}`,
        status: inspection.finalResult === "pass" ? "completed" : "failed",
        link: `/admin/textiles/quality-inspection/${inspection._id}`,
      });
    }

    // Warehouse
    if (taka.warehouse) {
      timeline.push({
        stage: "Current Location",
        date: taka.updatedAt,
        icon: "🏢",
        details: `${taka.warehouse.name} – ${taka.location || "Not specified"}`,
        status: "active",
      });
    }

    // Sort timeline by date (oldest first)
    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Build response
    const traceability = {
      taka,
      design: taka.designRef || bom?.design || null,
      productionOrder,
      lot,
      lotAssignment,
      bom,
      routing,
      challans,
      receipts,
      inspections,
      timeline,
      summary: {
        totalChallanQty: challans.reduce((sum, c) => {
          const item = c.items.find(i => i.taka?._id?.toString() === takaId);
          return sum + (item?.quantity || 0);
        }, 0),
        totalReceivedQty: receipts.reduce((sum, r) => {
          const item = r.items.find(i => i.taka?._id?.toString() === takaId);
          return sum + (item?.receivedQuantity || 0);
        }, 0),
        totalInspections: inspections.length,
        totalChallans: challans.length,
        passCount: inspections.filter(i => i.finalResult === "pass").length,
        failCount: inspections.filter(i => i.finalResult === "fail").length,
      },
    };

    return NextResponse.json({ success: true, data: traceability });
  } catch (err) {
    console.error("Traceability error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
