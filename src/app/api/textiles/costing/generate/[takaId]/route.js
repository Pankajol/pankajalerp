import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Taka from "@/models/textiles/Taka";
import Costing from "@/models/textiles/Costing";
import TextileBOM from "@/models/textiles/TextileBOM";
import WeavingWIP from "@/models/textiles/WeavingWIP";
import JobWorkReceipt from "@/models/textiles/JobWorkReceipt";

export async function POST(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { takaId } = params;

    // Get Taka details
    const taka = await Taka.findOne({ _id: takaId, companyId: user.companyId })
      .populate("fabric", "itemName itemCode")
      .populate("productionOrder", "orderNumber");
    if (!taka) {
      return NextResponse.json({ success: false, message: "Taka not found" }, { status: 404 });
    }

    const costBreakdown = [];
    let materialCost = 0;
    let laborCost = 0;
    let overheadCost = 0;
    let jobWorkCost = 0;
    let wasteCost = 0;

    // 1. Material Cost from BOM
    const bom = await TextileBOM.findOne({
      companyId: user.companyId,
      status: "active",
      $or: [
        ...(taka.designRef ? [{ design: taka.designRef }] : []),
        { product: taka.fabric },
      ],
    }).populate("components.item", "itemName itemCode");

    if (bom && bom.components) {
      // Assume item costs are available from item master or purchase orders
      // For demo, we'll use estimated costs
      for (const comp of bom.components) {
        const cost = comp.quantity * 100; // Estimated per unit cost
        materialCost += cost;
        costBreakdown.push({
          category: "material",
          description: `${comp.item?.itemName || "Material"} × ${comp.quantity} ${comp.unit}`,
          amount: cost,
          quantity: comp.quantity,
          unit: comp.unit,
          source: bom.bomCode,
        });
      }
    }

    // 2. Labor Cost from Weaving WIP
    const wipRecords = await WeavingWIP.find({
      taka: takaId,
      companyId: user.companyId,
    }).populate("operator", "name");

    for (const wip of wipRecords) {
      // Estimated labor rate per hour
      const laborRate = 200;
      const laborHours = wip.producedQuantity / 50; // 50 Mtr per hour assumption
      const cost = laborHours * laborRate;
      laborCost += cost;
      costBreakdown.push({
        category: "labor",
        description: `Operator ${wip.operator?.name || "Unknown"} - ${wip.shift} shift`,
        amount: cost,
        rate: laborRate,
        quantity: laborHours,
        unit: "hours",
        source: wip._id.toString(),
      });
    }

    // 3. Job Work Cost from Receipts
    const receipts = await JobWorkReceipt.find({
      companyId: user.companyId,
      "items.taka": takaId,
    }).populate("vendor", "name");

    for (const receipt of receipts) {
      const item = receipt.items.find((i) => i.taka?.toString() === takaId);
      if (item) {
        // Estimated job work cost per meter
        const costPerMtr = 50;
        const cost = item.receivedQuantity * costPerMtr;
        jobWorkCost += cost;
        costBreakdown.push({
          category: "jobwork",
          description: `Job work from ${receipt.vendor?.name || "Vendor"}`,
          amount: cost,
          quantity: item.receivedQuantity,
          unit: "Mtr",
          source: receipt.receiptNumber,
        });
      }
    }

    // 4. Overhead (estimated)
    overheadCost = (materialCost + laborCost + jobWorkCost) * 0.15; // 15% overhead
    costBreakdown.push({
      category: "overhead",
      description: "Factory Overhead (15%)",
      amount: overheadCost,
    });

    // 5. Waste Cost
    // Calculate waste from production losses
    const wasteQty = taka.quantity * 0.02; // 2% estimated waste
    wasteCost = wasteQty * 100; // estimated cost per Mtr
    costBreakdown.push({
      category: "waste",
      description: `Waste (${wasteQty.toFixed(2)} Mtr)`,
      amount: wasteCost,
      quantity: wasteQty,
      unit: "Mtr",
    });

    // Calculate total
    const totalCost = materialCost + laborCost + overheadCost + jobWorkCost + wasteCost;

    // Create costing record
    const costing = new Costing({
      companyId: user.companyId,
      design: taka.designRef || bom?.design || undefined,
      taka: takaId,
      productionOrder: taka.productionOrder,
      periodStart: new Date(),
      periodEnd: new Date(),
      costBreakdown,
      totalCost,
      costPerMeter: taka.quantity > 0 ? totalCost / taka.quantity : 0,
      costPerKg: taka.weight > 0 ? totalCost / taka.weight : 0,
      materialCost,
      laborCost,
      overheadCost,
      jobWorkCost,
      wasteCost,
      totalQty: taka.quantity,
      unit: "Mtr",
      status: "draft",
      createdBy: user.id,
      remarks: "Auto-generated from Taka data",
    });
    await costing.save();

    return NextResponse.json({ success: true, data: costing });
  } catch (err) {
    console.error("Generate costing error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
