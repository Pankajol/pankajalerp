import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import GreigeFolding from "@/models/textiles/GreigeFolding";
import Taka from "@/models/textiles/Taka";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const record = await GreigeFolding.findOne({ _id: params.id, company: user.companyId })
      .populate("productionOrder", "orderNumber item quantity unit")
      .populate("machine", "name code")
      .populate("lot", "lotNumber")
      .populate("operator", "name")
      .populate("createdBy", "name");
    if (!record) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: record });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    // If status changes to approved, create Takas if not already
    const existing = await GreigeFolding.findOne({ _id: params.id, company: user.companyId });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    if (body.status === "approved" && existing.status !== "approved") {
      // Create Takas
      const ProductionOrder = await import("@/models/ppc/ProductionOrder").then((m) => m.default);
      const po = await ProductionOrder.findOne({ _id: existing.productionOrder, company: user.companyId });
      if (body.takas && body.takas.length > 0) {
        const takaPromises = body.takas.map(async (t) => {
          const takaData = {
            companyId: user.companyId,
            takaNumber: t.takaNumber,
            productionOrder: existing.productionOrder,
            lot: existing.lot || null,
            fabric: po?.item,
            quantity: t.meters,
            weight: t.weight || 0,
            width: t.width || 0,
            status: "available",
            createdBy: user.id,
          };
          const newTaka = new Taka(takaData);
          await newTaka.save();
          return newTaka._id;
        });
        await Promise.all(takaPromises);
      }
    }
    const record = await GreigeFolding.findOneAndUpdate(
      { _id: params.id, company: user.companyId },
      body,
      { new: true, runValidators: true }
    );
    return NextResponse.json({ success: true, data: record });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const record = await GreigeFolding.findOneAndDelete({ _id: params.id, company: user.companyId });
    if (!record) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
