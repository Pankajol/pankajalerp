import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Costing from "@/models/textiles/Costing";
import "@/models/textiles/Design";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const costing = await Costing.findOne({ _id: id, companyId: user.companyId })
      .populate("taka", "takaNumber quantity fabric shade")
      .populate("design", "designCode description")
      .populate("productionOrder", "orderNumber")
      .populate("createdBy", "name");
    if (!costing) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: costing });
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
    const { id } = await params;
    const costing = await Costing.findOne({ _id: id, companyId: user.companyId });
    if (!costing) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    const protectedFields = new Set(["_id", "companyId", "costingNumber", "createdBy", "createdAt", "updatedAt"]);
    for (const [key, value] of Object.entries(body)) {
      if (!protectedFields.has(key)) costing.set(key, value);
    }
    await costing.save();
    return NextResponse.json({ success: true, data: costing });
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
    const { id } = await params;
    const costing = await Costing.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!costing) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
