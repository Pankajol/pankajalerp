import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import InventoryValuation from "@/models/textiles/InventoryValuation";
import Inventory from "@/models/Inventory";

// GET: List all valuations
export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const method = searchParams.get("method") || "";
    const filter = { companyId: user.companyId };
    if (method) filter.method = method;

    const valuations = await InventoryValuation.find(filter)
      .populate("items.item", "itemName itemCode category")
      .populate("warehouse", "name")
      .populate("createdBy", "name")
      .sort({ valuationDate: -1 });

    return NextResponse.json({ success: true, data: valuations });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST: Calculate valuation
export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { method, itemId, warehouse } = body;

    // Get inventory items
    const filter = { companyId: user.companyId };
    if (itemId) filter.item = itemId;
    if (warehouse) filter.warehouse = warehouse;

    // Fetch inventory records with purchase order details for cost calculation
    const inventoryItems = await Inventory.find(filter)
      .populate("item", "itemName itemCode unit")
      .populate("purchaseOrder", "purchaseOrderNumber");

    if (!inventoryItems || inventoryItems.length === 0) {
      return NextResponse.json({
        success: true,
        data: { items: [], message: "No inventory items found" },
      });
    }

    // Group items by product
    const groupedItems = {};
    for (const inv of inventoryItems) {
      const key = inv.item._id.toString();
      if (!groupedItems[key]) {
        groupedItems[key] = {
          item: inv.item,
          batches: [],
          totalQuantity: 0,
          totalCost: 0,
        };
      }
      groupedItems[key].batches.push({
        batch: inv.batch || inv.lotNumber || "",
        purchaseOrder: inv.purchaseOrder,
        quantity: inv.quantity,
        unit: inv.unit || inv.item.unit || "Pcs",
        unitCost: inv.unitCost || 0,
        totalCost: (inv.unitCost || 0) * inv.quantity,
        receivedDate: inv.receivedDate || inv.createdAt,
        warehouse: inv.warehouse,
        location: inv.location,
      });
      groupedItems[key].totalQuantity += inv.quantity;
      groupedItems[key].totalCost += (inv.unitCost || 0) * inv.quantity;
    }

    // Apply valuation method per item
    const resultItems = [];
    for (const [itemId, group] of Object.entries(groupedItems)) {
      const batches = group.batches.sort((a, b) => new Date(a.receivedDate) - new Date(b.receivedDate));

      let valuedBatches = [];
      let totalValue = 0;

      if (method === "fifo") {
        // FIFO: Use oldest first
        valuedBatches = batches.map(b => ({
          ...b,
          valuationCost: b.unitCost,
        }));
      } else if (method === "lifo") {
        // LIFO: Use newest first
        valuedBatches = [...batches].reverse().map(b => ({
          ...b,
          valuationCost: b.unitCost,
        }));
      } else if (method === "weighted-average") {
        // Weighted Average: Calculate average cost
        const totalQty = batches.reduce((sum, b) => sum + b.quantity, 0);
        const totalCost = batches.reduce((sum, b) => sum + b.totalCost, 0);
        const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
        valuedBatches = batches.map(b => ({
          ...b,
          valuationCost: avgCost,
          totalCost: avgCost * b.quantity,
        }));
      } else {
        // Default: use original cost
        valuedBatches = batches.map(b => ({
          ...b,
          valuationCost: b.unitCost,
        }));
      }

      // Calculate totals
      const totalQuantity = valuedBatches.reduce((sum, b) => sum + b.quantity, 0);
      const totalCost = valuedBatches.reduce((sum, b) => sum + (b.valuationCost || b.unitCost) * b.quantity, 0);

      resultItems.push({
        item: group.item,
        batches: valuedBatches,
        totalQuantity,
        totalCost,
        unitCost: totalQuantity > 0 ? totalCost / totalQuantity : 0,
        method,
      });
    }

    // Save valuation if requested
    let savedValuation = null;
    if (body.save) {
      const valuation = new InventoryValuation({
        companyId: user.companyId,
        valuationDate: new Date(),
        method,
        items: resultItems.flatMap(item =>
          item.batches.map(b => ({
            item: item.item._id,
            batch: b.batch || "",
            purchaseOrder: b.purchaseOrder?._id || b.purchaseOrder,
            quantity: b.quantity,
            unit: b.unit,
            unitCost: b.valuationCost || b.unitCost,
            totalCost: (b.valuationCost || b.unitCost) * b.quantity,
            receivedDate: b.receivedDate,
            warehouse: b.warehouse,
            location: b.location,
            status: "in-stock",
          }))
        ),
        warehouse,
        createdBy: user.id,
        status: body.status || "draft",
        remarks: body.remarks || "",
      });
      savedValuation = await valuation.save();
    }

    return NextResponse.json({
      success: true,
      data: {
        valuation: savedValuation,
        items: resultItems,
        totalItems: resultItems.length,
        method,
        calculationDate: new Date(),
      },
    });
  } catch (err) {
    console.error("Valuation error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
