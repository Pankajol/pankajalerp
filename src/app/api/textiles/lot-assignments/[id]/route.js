import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import LotAssignment from "@/models/textiles/LotAssignment";
import Lot from "@/models/textiles/Lot";

// ─── GET Single Assignment ───
export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    console.log("🔍 Looking for assignment with id:", id);
    console.log("👤 User companyId:", user.companyId);

    const assignment = await LotAssignment.findOne({
      _id: id,
       companyId: user.companyId 
,
    })
      .populate("productionOrder", "orderNumber productionDocNo")
      .populate("lot", "lotNumber product shade quantity unit")
      .populate("item", "itemName itemCode")
     

    console.log("📦 Assignment found:", assignment ? "Yes" : "No");

    if (!assignment) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: assignment });
  } catch (err) {
    console.error("GET /lot-assignments/[id] error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ─── PUT Update Assignment ───
export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params; // ✅ await params

    const body = await req.json();
    const assignment = await LotAssignment.findOne({
      _id: id,
      companyId: user.companyId,
    });

    if (!assignment) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }

    // If assignedQuantity changes, adjust lot quantity
    if (body.assignedQuantity !== undefined && body.assignedQuantity !== assignment.assignedQuantity) {
      const diff = body.assignedQuantity - assignment.assignedQuantity;
      const lot = await Lot.findOne({
        _id: assignment.lot,
        companyId: user.companyId,
      });

      if (!lot) {
        return NextResponse.json({ success: false, message: "Lot not found" }, { status: 404 });
      }

      if (diff > 0 && lot.quantity < diff) {
        return NextResponse.json({ success: false, message: "Insufficient lot quantity" }, { status: 400 });
      }

      lot.quantity -= diff;
      await lot.save();
      body.availableQuantity = lot.quantity;
    }

    const updated = await LotAssignment.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      body,
      { new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("PUT /lot-assignments/[id] error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ─── DELETE Assignment ───
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params; // ✅ await params

    const assignment = await LotAssignment.findOneAndDelete({
      _id: id,
      companyId: user.companyId,
    });

    if (!assignment) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }

    // Restore lot quantity
    const lot = await Lot.findOne({
      _id: assignment.lot,
      companyId: user.companyId,
    });

    if (lot) {
      lot.quantity += assignment.assignedQuantity;
      await lot.save();
    }

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error("DELETE /lot-assignments/[id] error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}