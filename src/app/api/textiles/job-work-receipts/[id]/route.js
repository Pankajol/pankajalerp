import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import JobWorkReceipt from "@/models/textiles/JobWorkReceipt";
import JobWorkChallan from "@/models/textiles/JobWorkChallan";
import JobWorkRequest from "@/models/textiles/JobWorkRequest";
import Taka from "@/models/textiles/Taka";
import "@/models/SupplierModels";
import "@/models/warehouseModels";

const editableFields = [
  "receivedDate", "fromWarehouse", "toWarehouse", "vendorChallanNo", "vendorLotNo",
  "items", "processLoss", "wastage", "shortage", "reason", "lotComplete",
];

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const receipt = await JobWorkReceipt.findOne({ _id: id, companyId: user.companyId })
      .populate("challan", "challanNumber issuedDate process request")
      .populate("vendor", "supplierName supplierCode emailId mobileNumber billingAddresses")
      .populate("fromWarehouse", "warehouseName warehouseCode")
      .populate("toWarehouse", "warehouseName warehouseCode")
      .populate("items.taka", "takaNumber quantity fabric design shade status");
    if (!receipt) return NextResponse.json({ success: false, message: "Receipt not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: receipt });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const receipt = await JobWorkReceipt.findOne({ _id: id, companyId: user.companyId });
    if (!receipt) return NextResponse.json({ success: false, message: "Receipt not found" }, { status: 404 });
    if (receipt.status === "qc") {
      return NextResponse.json({ success: false, message: "A QC-completed receipt cannot be edited" }, { status: 400 });
    }
    const body = await req.json();
    for (const key of editableFields) if (key in body) receipt[key] = body[key];
    if (!receipt.toWarehouse || !receipt.items.length || receipt.items.some((item) => Number(item.receivedQuantity) <= 0)) {
      return NextResponse.json({ success: false, message: "Warehouse and positive received quantities are required" }, { status: 400 });
    }
    await receipt.save();
    return NextResponse.json({ success: true, data: receipt });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const receipt = await JobWorkReceipt.findOne({ _id: id, companyId: user.companyId });
    if (!receipt) return NextResponse.json({ success: false, message: "Receipt not found" }, { status: 404 });
    if (receipt.status === "qc") {
      return NextResponse.json({ success: false, message: "A QC-completed receipt cannot be deleted" }, { status: 400 });
    }
    const challan = await JobWorkChallan.findOne({ _id: receipt.challan, companyId: user.companyId });
    await receipt.deleteOne();
    if (challan) {
      challan.status = "issued";
      await challan.save();
      await Promise.all([
        JobWorkRequest.updateOne({ _id: challan.request, companyId: user.companyId }, { status: "in-progress" }),
        Taka.updateMany({ _id: { $in: receipt.items.map((item) => item.taka) }, companyId: user.companyId }, { status: "job-work" }),
      ]);
    }
    return NextResponse.json({ success: true, message: "Receipt deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
