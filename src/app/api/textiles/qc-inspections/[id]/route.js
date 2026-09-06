import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import QCInspection from "@/models/textiles/QCInspection";
import "@/models/textiles/Design";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const inspection = await QCInspection.findOne({
      _id: (await params).id,
      companyId: user.companyId,
    })
      .populate("taka", "takaNumber quantity fabric design shade width weight")
      .populate("design", "designCode description")
      .populate("inspector", "name")
      .populate("approvedBy", "name")
      .populate("parameters.parameter", "name code unit minValue maxValue");

    if (!inspection) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: inspection });
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
    delete body.inspector;
    const inspection = await QCInspection.findOneAndUpdate(
      { _id: (await params).id, companyId: user.companyId },
      body,
      { new: true, runValidators: true }
    );
    if (!inspection) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: inspection });
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

    const inspection = await QCInspection.findOneAndDelete({
      _id: (await params).id,
      companyId: user.companyId,
    });
    if (!inspection) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
