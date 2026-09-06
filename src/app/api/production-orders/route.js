




import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ProductionOrder from "@/models/ProductionOrder";
import SalesOrder from "@/models/SalesOrder";
import BOM from "@/models/BOM";
import Item from "@/models/ItemModels";
import Warehouse from "@/models/warehouseModels";
import CompanyUser from "@/models/CompanyUser";
import StockMovement from "@/models/StockMovement";
import JobCard from "@/models/ppc/JobCardModel";
import Machine from "@/models/ppc/machineModel";
import Operation from "@/models/ppc/operationModel";
import Operator from "@/models/ppc/operatorModel";
import Resource from "@/models/ppc/resourceModel"; // ✅ ADD THIS LINE


import { getTokenFromHeader, verifyJWT } from "@/lib/auth";



export async function POST(request) {
  await connectDB();

  try {
    const token = getTokenFromHeader(request);
    const user = verifyJWT(token);

    if (!user?.companyId) {
      return NextResponse.json(
        { error: "Company ID missing in token" },
        { status: 401 }
      );
    }

    const data = await request.json();
    const companyId = user.companyId;

    // ✅ Generate unique productionDocNo per company
    const companyCode =
      user.companyCode ||
      companyId.slice(-4).toUpperCase(); // fallback to last 4 chars
    // Derive the next number from every company record—not only the newest
    // one—so imports and old records cannot cause a duplicate document number.
    const existingNumbers = await ProductionOrder.find({
      companyId,
      productionDocNo: { $regex: `^PROD-\\d+-${companyCode}$` },
    }).select("productionDocNo").lean();
    let nextNumber = existingNumbers.reduce((highest, order) => {
      const match = order.productionDocNo?.match(/^PROD-(\d+)-/);
      return Math.max(highest, Number(match?.[1] || 0));
    }, 0) + 1;
    let productionDocNo = `PROD-${String(nextNumber).padStart(4, "0")}-${companyCode}`;
    while (await ProductionOrder.exists({ productionDocNo })) {
      nextNumber += 1;
      productionDocNo = `PROD-${String(nextNumber).padStart(4, "0")}-${companyCode}`;
    }

    // ✅ Attach company & user info
    data.companyId = companyId;
    data.createdBy = user._id || user.id;
    data.productionDocNo = productionDocNo;

    // Optional: handle warehouse + items
    if (!data.warehouse) data.warehouse = null;

    if (Array.isArray(data.items)) {
      data.items = data.items.map((it) => ({
        ...it,
        warehouse: it.warehouse || null,
      }));
    }

    // ✅ Save Production Order
    const order = new ProductionOrder(data);
    const saved = await order.save();

    // ✅ Update linked Sales Orders
    if (saved.salesOrder?.length > 0) {
      await SalesOrder.updateMany(
        {
          _id: { $in: saved.salesOrder },
          companyId,
        },
        {
          $set: {
            status: "LinkedToProductionOrder",
            linkedProductionOrder: saved._id,
          },
        }
      );
    }

    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error("❌ Error creating production order:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create production order" },
      { status: 400 }
    );
  }
}

// ✅ Get all Production Orders for the company
// export async function GET(request) {
//   await connectDB();

//   try {
//     const token = getTokenFromHeader(request);
//     const user = verifyJWT(token);

//     if (!user?.companyId) {
//       return NextResponse.json(
//         { error: "Company ID missing in token" },
//         { status: 401 }
//       );
//     }
//     const orders = await ProductionOrder.find({ companyId: user.companyId })
//       .populate({ path: "operationFlow.operation", strictPopulate: false })
//       .populate({ path: "operationFlow.machine", strictPopulate: false })
//       .populate({ path: "operationFlow.operator", strictPopulate: false })
//       .lean();

//     return NextResponse.json(orders, { status: 200 });
//   } catch (err) {
//     console.error("❌ Error fetching production orders:", err);
//     return NextResponse.json(
//       { error: err.message || "Failed to fetch production orders" },
//       { status: 400 }
//     );
//   }
// }



export async function GET(request) {
  await connectDB();

  try {
    const token = getTokenFromHeader(request);
    const user = verifyJWT(token);

    if (!user?.companyId) {
      return NextResponse.json(
        { success: false, error: "Company ID missing in token" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit")) || 100;
    // Paginate when requested by searchable forms; preserve existing callers.
    const paginated = searchParams.has("page");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const pageSize = paginated ? Math.min(Math.max(limit, 1), 100) : limit;
    const status = searchParams.get("status") || "";
    const filter = { companyId: user.companyId };
    if (status) filter.status = status;

    const orders = await ProductionOrder.find(filter)
      .populate({ path: "operationFlow.operation", strictPopulate: false })
      .populate({ path: "operationFlow.machine", strictPopulate: false })
      .populate({ path: "operationFlow.operator", strictPopulate: false })
      .populate({ path: "resources", strictPopulate: false }) // ← safe populate
      .skip(paginated ? (page - 1) * pageSize : 0)
      .limit(pageSize)
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    const meta = paginated
      ? { page, limit: pageSize, pages: Math.ceil(await ProductionOrder.countDocuments(filter) / pageSize) }
      : undefined;
    return NextResponse.json(
      { success: true, data: orders, ...(meta ? { meta } : {}) },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error fetching production orders:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch production orders" },
      { status: 400 }
    );
  }
}





