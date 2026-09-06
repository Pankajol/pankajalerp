// app/api/textiles/bom/[id]/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import TextileBOM from "@/models/textiles/TextileBOM";
import Design from "@/models/textiles/Design";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const data = await TextileBOM.findOne({ _id: params.id, companyId: user.companyId })
      .populate("product", "itemName itemCode")
      .populate("design", "designCode description status")
      .populate("shade", "name code")
      .populate("components.item", "itemName itemCode");
    if (!data) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
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
    delete body.companyId;
    delete body.createdBy;
    if (body.design && !(await Design.exists({ _id: body.design, companyId: user.companyId }))) {
      return NextResponse.json({ success: false, message: "Design not found" }, { status: 400 });
    }
    const data = await TextileBOM.findOneAndUpdate(
      { _id: params.id, companyId: user.companyId },
      body,
      { new: true, runValidators: true }
    );
    if (!data) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
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
    const data = await TextileBOM.findOneAndDelete({ _id: params.id, companyId: user.companyId });
    if (!data) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
