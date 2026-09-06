import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import JobWorkChallan from "@/models/textiles/JobWorkChallan";
import JobWorkRequest from "@/models/textiles/JobWorkRequest";
import JobWorkReceipt from "@/models/textiles/JobWorkReceipt";
import "@/models/SupplierModels";
import "@/models/warehouseModels";

const editableFields = [
  "fromWarehouse", "toWarehouse", "vendorChallanNo", "issuedDate", "expectedReturnDate",
  "transport", "vehicleNo", "driverName", "notes", "items",
];

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const challan = await JobWorkChallan.findOne({ _id: id, companyId: user.companyId })
      .populate("request", "requestNumber designCode customerName")
      .populate("vendor", "supplierName supplierCode emailId mobileNumber billingAddresses")
      .populate("fromWarehouse", "warehouseName warehouseCode")
      .populate("toWarehouse", "warehouseName warehouseCode")
      .populate("items.taka", "takaNumber quantity fabric design shade status");
    if (!challan) return NextResponse.json({ success: false, message: "Challan not found" }, { status: 404 });
    const linkedReceipt = await JobWorkReceipt.findOne({ challan: id, companyId: user.companyId })
      .select("receiptNumber status")
      .lean();
    return NextResponse.json({ success: true, data: { ...challan.toObject(), linkedReceipt } });
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
    const challan = await JobWorkChallan.findOne({ _id: id, companyId: user.companyId });
    if (!challan) return NextResponse.json({ success: false, message: "Challan not found" }, { status: 404 });
    if (challan.status !== "draft") {
      return NextResponse.json({ success: false, message: "Only draft challans can be edited" }, { status: 400 });
    }
    const body = await req.json();
    for (const key of editableFields) if (key in body) challan[key] = body[key];
    if (!challan.items.length || challan.items.some((item) => !item.taka || Number(item.quantity) <= 0)) {
      return NextResponse.json({ success: false, message: "Every item needs a taka and positive quantity" }, { status: 400 });
    }
    await challan.save();
    return NextResponse.json({ success: true, data: challan });
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
    const challan = await JobWorkChallan.findOne({ _id: id, companyId: user.companyId });
    if (!challan) return NextResponse.json({ success: false, message: "Challan not found" }, { status: 404 });
    if (challan.status !== "draft") {
      return NextResponse.json({ success: false, message: "Only draft challans can be deleted" }, { status: 400 });
    }
    if (await JobWorkReceipt.exists({ challan: id, companyId: user.companyId })) {
      return NextResponse.json({ success: false, message: "Delete the linked receipt first" }, { status: 409 });
    }
    await challan.deleteOne();
    return NextResponse.json({ success: true, message: "Challan deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
