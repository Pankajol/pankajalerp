import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import ProductionOrder from "@/models/ppc/ProductionOrder";
import TextileBOM from "@/models/textiles/TextileBOM";
import Inventory from "@/models/Inventory";
import MRP from "@/models/textiles/MRP";

export async function GET(req) {
  // This endpoint calculates and returns MRP data without saving
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const horizonStart = searchParams.get("horizonStart") || "";
    const horizonEnd = searchParams.get("horizonEnd") || "";
    const productionOrderId = searchParams.get("productionOrder") || "";

    // Build filter for production orders
    const poFilter = { companyId: user.companyId, status: { $in: ["Released", "In Progress"] } };
    if (horizonStart && horizonEnd) {
      poFilter.deliveryDate = { $gte: new Date(horizonStart), $lte: new Date(horizonEnd) };
    }
    if (productionOrderId) {
      poFilter._id = productionOrderId;
    }

    const orders = await ProductionOrder.find(poFilter).populate("item", "itemName itemCode unit");
    if (!orders.length) {
      return NextResponse.json({
        success: true,
        data: { items: [], message: "No production orders in the given horizon" },
      });
    }

    // Collect all finished products (items)
    const productIds = orders.map((o) => o.item._id);
    const distinctProducts = [...new Set(productIds.map(id => id.toString()))];

    // For each product, get its BOM
    const boms = await TextileBOM.find({ product: { $in: distinctProducts }, companyId: user.companyId })
      .populate("components.item", "itemName itemCode unit");

    // Build a map: product -> BOM components
    const bomMap = {};
    for (const bom of boms) {
      const productId = bom.product.toString();
      bomMap[productId] = bom.components;
    }

    // Aggregate material requirements from all orders
    const materialRequirements = {};

    for (const order of orders) {
      const productId = order.item._id.toString();
      const components = bomMap[productId] || [];
      const orderQty = order.quantity || 0;

      for (const comp of components) {
        const itemId = comp.item._id.toString();
        const requiredQty = comp.quantity * orderQty;
        if (!materialRequirements[itemId]) {
          materialRequirements[itemId] = {
            item: comp.item,
            requiredQty: 0,
            unit: comp.unit,
            sourceOrders: [],
          };
        }
        materialRequirements[itemId].requiredQty += requiredQty;
        if (!materialRequirements[itemId].sourceOrders.includes(order._id)) {
          materialRequirements[itemId].sourceOrders.push(order._id);
        }
      }
    }

    // Fetch current stock levels, safety stock, pending purchases
    const itemIds = Object.keys(materialRequirements);
    const stocks = await Inventory.find({ item: { $in: itemIds }, companyId: user.companyId });
    const stockMap = {};
    for (const s of stocks) {
      stockMap[s.item.toString()] = s.quantity || 0;
    }

    // (Optional) Fetch pending purchase orders - simplified
    // For demo, we assume no pending purchases.

    // Build the final item list
    const items = [];
    for (const [itemId, req] of Object.entries(materialRequirements)) {
      const availableStock = stockMap[itemId] || 0;
      const safetyStock = 10; // default safety stock, can be read from item master
      const pendingPurchase = 0; // not implemented for now
      const netRequirement = req.requiredQty - availableStock - pendingPurchase + safetyStock;
      items.push({
        item: req.item,
        requiredQty: req.requiredQty,
        availableStock,
        safetyStock,
        pendingPurchase,
        netRequirement: netRequirement > 0 ? netRequirement : 0,
        suggestedOrderQty: netRequirement > 0 ? netRequirement : 0,
        unit: req.unit || "Pcs",
        sourceOrders: req.sourceOrders,
        remarks: "",
      });
    }

    // Sort by net requirement descending
    items.sort((a, b) => b.netRequirement - a.netRequirement);

    return NextResponse.json({
      success: true,
      data: {
        items,
        totalItems: items.length,
        totalNetRequirement: items.reduce((sum, i) => sum + i.netRequirement, 0),
        ordersCount: orders.length,
        horizonStart,
        horizonEnd,
      },
    });
  } catch (err) {
    console.error("MRP calculation error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  // Save the MRP run result
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // Validate
    if (!body.items || !body.items.length) {
      return NextResponse.json({ success: false, message: "No items to save" }, { status: 400 });
    }

    const mrp = new MRP({
      companyId: user.companyId,
      runDate: new Date(),
      horizonStart: body.horizonStart ? new Date(body.horizonStart) : new Date(),
      horizonEnd: body.horizonEnd ? new Date(body.horizonEnd) : new Date(),
      items: body.items.map((i) => ({
        item: i.item._id,
        requiredQty: i.requiredQty,
        availableStock: i.availableStock,
        safetyStock: i.safetyStock || 0,
        pendingPurchase: i.pendingPurchase || 0,
        netRequirement: i.netRequirement,
        suggestedOrderQty: i.suggestedOrderQty || i.netRequirement,
        unit: i.unit,
        sourceOrders: i.sourceOrders || [],
        remarks: i.remarks || "",
      })),
      status: body.status || "draft",
      createdBy: user.id,
      remarks: body.remarks || "",
    });
    await mrp.save();

    return NextResponse.json({ success: true, data: mrp });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
