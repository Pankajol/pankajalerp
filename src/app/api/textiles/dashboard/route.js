import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Item from "@/models/ItemModels";
import ProductionOrder from "@/models/ProductionOrder";
import PPCProductionOrder from "@/models/ppc/ProductionOrder";
import SalesOrderProduction from "@/models/textiles/SalesOrderProduction";
import DyeingRecipe from "@/models/textiles/DyeingRecipe";
import Taka from "@/models/textiles/Taka";
import JobWorkRequest from "@/models/textiles/JobWorkRequest";
import QCInspection from "@/models/textiles/QCInspection";
import TextileDocument from "@/models/textiles/TextileDocument";

const asStatusSeries = (rows) =>
  rows.map((row) => ({ label: row._id || "Unspecified", value: row.value }));

const statusCounts = (Model, match) =>
  Model.aggregate([
    { $match: match },
    { $group: { _id: "$status", value: { $sum: 1 } } },
    { $sort: { value: -1, _id: 1 } },
  ]);

const genericProductionDoctypes = [
  "textile-production-plan",
  "production-batch",
  "process-order",
  "dyeing-order",
  "printing-order",
  "finishing-order",
];

const genericStatusCounts = (records) => {
  const counts = new Map();
  records.forEach((record) => {
    const status = record.status || "Draft";
    counts.set(status, (counts.get(status) || 0) + 1);
  });
  return [...counts.entries()].map(([label, value]) => ({ label, value }));
};

export async function GET(req) {
  try {
    await dbConnect();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user?.companyId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const companyId = user.companyId;
    const legacyUnlinked = { companyId, "canonicalReference.recordId": { $exists: false } };
    const [products, standardOrderCount, ppcOrderCount, salesOrderProductionCount, legacyProductionCount, canonicalRecipeCount, legacyRecipeCount, availableTakas, activeJobWork, pendingQc, recentStandardOrders, recentPpcOrders, recentSalesOrders, items, productionStatus, ppcStatus, salesProductionStatus, jobWorkStatus, qcStatus, takaStatus, genericTextileDocuments] = await Promise.all([
      Item.countDocuments({ companyId, isTextile: true }),
      ProductionOrder.countDocuments({ companyId }),
      PPCProductionOrder.countDocuments({ companyId }),
      SalesOrderProduction.countDocuments({ companyId }),
      TextileDocument.countDocuments({ ...legacyUnlinked, doctype: { $in: genericProductionDoctypes } }),
      DyeingRecipe.countDocuments({ companyId }),
      TextileDocument.countDocuments({ ...legacyUnlinked, doctype: "dyeing-recipe" }),
      Taka.countDocuments({ companyId, status: { $in: ["available", "reserved", "partially-sold"] } }),
      JobWorkRequest.countDocuments({ companyId, status: { $in: ["submitted", "approved", "in-progress"] } }),
      QCInspection.countDocuments({ companyId, status: { $in: ["draft", "pending", "hold", "rework"] } }),
      ProductionOrder.find({ companyId }).sort({ updatedAt: -1 }).limit(6).lean(),
      PPCProductionOrder.find({ companyId }).sort({ updatedAt: -1 }).limit(6).lean(),
      SalesOrderProduction.find({ companyId }).sort({ updatedAt: -1 }).limit(6).lean(),
      Item.find({ companyId, isTextile: true }).select("itemCode itemName quantity stockQuantity reorderLevel").lean(),
      statusCounts(ProductionOrder, { companyId }),
      statusCounts(PPCProductionOrder, { companyId }),
      statusCounts(SalesOrderProduction, { companyId }),
      statusCounts(JobWorkRequest, { companyId }),
      statusCounts(QCInspection, { companyId }),
      statusCounts(Taka, { companyId }),
      TextileDocument.find({
        companyId,
        doctype: { $in: [...genericProductionDoctypes, "dyeing-recipe", "fabric-roll", "fabric-inspection", "job-work-order"] },
      }).select("doctype status canonicalReference").lean(),
    ]);
    const lowStock = items
      .filter((item) => Number(item.reorderLevel || 0) > 0 && Number(item.stockQuantity ?? item.quantity ?? 0) < Number(item.reorderLevel))
      .slice(0, 6)
      .map((item) => ({ ...item, stockQuantity: Number(item.stockQuantity ?? item.quantity ?? 0) }));
    const recentOrders = [
      ...recentStandardOrders.map((order) => ({ ...order, source: "Production order", displayNumber: order.productionDocNo, displayItem: order.items?.[0]?.itemName || order.productDesc, displayQuantity: order.quantity, href: `/admin/ppc/productionOrderPage/${order._id}/jobcards` })),
      ...recentPpcOrders.map((order) => ({ ...order, source: "PPC order", displayNumber: order.orderNumber, displayItem: order.itemName, displayQuantity: order.quantity, href: "/admin/ppc/productionOrderPage?type=textile" })),
      ...recentSalesOrders.map((order) => ({ ...order, source: "Sales production", displayNumber: `SOP-${String(order._id).slice(-6).toUpperCase()}`, displayItem: order.productionItems?.[0]?.fabricSpecification || order.remarks, displayQuantity: order.plannedQuantity, href: "/admin/textiles/sales-order-production" })),
    ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6);

    // Generic Textile DocTypes remain valid sources for records created before
    // their dedicated modules existed. Ignore only records already linked to a
    // canonical document, so the same business event is never counted twice.
    const genericRecords = genericTextileDocuments.filter((record) => !record.canonicalReference?.recordId);
    const genericProduction = genericRecords.filter((record) => genericProductionDoctypes.includes(record.doctype));
    const genericRolls = genericRecords.filter((record) => record.doctype === "fabric-roll");
    const genericQc = genericRecords.filter((record) => record.doctype === "fabric-inspection");
    const genericJobWork = genericRecords.filter((record) => record.doctype === "job-work-order");
    const genericAvailableTakas = genericRolls.filter((record) => ["available", "reserved", "partially sold", "partially-sold"].includes(String(record.status).toLowerCase())).length;
    const genericPendingQc = genericQc.filter((record) => ["draft", "pending", "hold", "rework"].includes(String(record.status).toLowerCase())).length;
    const genericActiveJobWork = genericJobWork.filter((record) => !["completed", "closed", "cancelled"].includes(String(record.status).toLowerCase())).length;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          products,
          productionOrders: standardOrderCount + ppcOrderCount + salesOrderProductionCount + legacyProductionCount,
          recipes: canonicalRecipeCount + legacyRecipeCount,
          availableTakas: availableTakas + genericAvailableTakas,
          activeJobWork: activeJobWork + genericActiveJobWork,
          pendingQc: pendingQc + genericPendingQc,
          lowStock: lowStock.length,
        },
        recentOrders,
        lowStock,
        charts: {
          production: [...asStatusSeries(productionStatus), ...asStatusSeries(ppcStatus), ...asStatusSeries(salesProductionStatus), ...genericStatusCounts(genericProduction)],
          jobWork: [...asStatusSeries(jobWorkStatus), ...genericStatusCounts(genericJobWork)],
          quality: [...asStatusSeries(qcStatus), ...genericStatusCounts(genericQc)],
          inventory: [...asStatusSeries(takaStatus), ...genericStatusCounts(genericRolls)],
        },
        sources: [
          { label: "Standard production", value: standardOrderCount, href: "/admin/ppc/productionOrderPage?type=textile" },
          { label: "PPC production", value: ppcOrderCount, href: "/admin/ppc/productionOrderPage?type=textile" },
          { label: "Sales production", value: salesOrderProductionCount, href: "/admin/textiles/sales-order-production" },
          { label: "Textile DocType production", value: legacyProductionCount, href: "/admin/textiles/doctype" },
          { label: "Dyeing recipes", value: canonicalRecipeCount, href: "/admin/textiles/dyeing-recipes" },
          { label: "Unlinked legacy recipes", value: legacyRecipeCount, href: "/admin/textiles/doctype/dyeing-recipe" },
          { label: "Textile DocType fabric rolls", value: genericRolls.length, href: "/admin/textiles/doctype/fabric-roll" },
        ],
      },
    });
  } catch (error) {
    console.error("GET /api/textiles/dashboard", error);
    return NextResponse.json({ success: false, message: "Unable to load Textile dashboard" }, { status: 500 });
  }
}
