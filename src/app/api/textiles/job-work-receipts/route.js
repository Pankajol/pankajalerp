import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import JobWorkReceipt from "@/models/textiles/JobWorkReceipt";
import JobWorkChallan from "@/models/textiles/JobWorkChallan";
import JobWorkRequest from "@/models/textiles/JobWorkRequest";
import Taka from "@/models/textiles/Taka";
import Supplier from "@/models/SupplierModels";
import "@/models/warehouseModels";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "";
    const filter = { companyId: user.companyId };
    if (search) {
      const pattern = escapeRegex(search);
      const [vendorIds, challanIds] = await Promise.all([
        Supplier.find({ companyId: user.companyId, supplierName: { $regex: pattern, $options: "i" } }).distinct("_id"),
        JobWorkChallan.find({ companyId: user.companyId, challanNumber: { $regex: pattern, $options: "i" } }).distinct("_id"),
      ]);
      filter.$or = [
        { receiptNumber: { $regex: pattern, $options: "i" } },
        { vendorChallanNo: { $regex: pattern, $options: "i" } },
        { vendorLotNo: { $regex: pattern, $options: "i" } },
        { vendor: { $in: vendorIds } },
        { challan: { $in: challanIds } },
      ];
    }
    if (status) filter.status = status;

    const receipts = await JobWorkReceipt.find(filter)
      .populate("challan", "challanNumber issuedDate process")
      .populate("vendor", "supplierName supplierCode emailId mobileNumber")
      .populate("toWarehouse", "warehouseName warehouseCode")
      .populate("items.taka", "takaNumber quantity fabric status")
      .sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: receipts });
  } catch (err) {
    console.error("GET job-work-receipts error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    if (!body.challan || !body.toWarehouse) {
      return NextResponse.json({ success: false, message: "Issued challan and destination warehouse are required" }, { status: 400 });
    }
    const challan = await JobWorkChallan.findOne({
      _id: body.challan, companyId: user.companyId, status: { $in: ["issued", "partial"] },
    });
    if (!challan) return NextResponse.json({ success: false, message: "Issued challan not found" }, { status: 404 });
    if (await JobWorkReceipt.exists({ challan: challan._id, companyId: user.companyId })) {
      return NextResponse.json({ success: false, message: "A receipt already exists for this challan" }, { status: 409 });
    }

    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length || items.some((item) => !item.taka || Number(item.receivedQuantity) <= 0)) {
      return NextResponse.json({ success: false, message: "Every item needs a taka and positive received quantity" }, { status: 400 });
    }
    const challanItems = new Map(challan.items.map((item) => [String(item.taka), Number(item.quantity)]));
    if (items.some((item) => !challanItems.has(String(item.taka)))) {
      return NextResponse.json({ success: false, message: "Receipt contains a taka outside the challan" }, { status: 400 });
    }

    const receipt = await JobWorkReceipt.create({
      ...body,
      items: items.map((item) => ({
        ...item,
        challanQuantity: challanItems.get(String(item.taka)),
        receivedQuantity: Number(item.receivedQuantity),
      })),
      receiptNumber: undefined,
      companyId: user.companyId,
      vendor: challan.vendor,
      receivedBy: user.id,
      status: "received",
    });
    challan.status = "completed";
    await challan.save();
    await Promise.all([
      JobWorkRequest.updateOne({ _id: challan.request, companyId: user.companyId }, { status: "completed" }),
      Taka.updateMany({ _id: { $in: receipt.items.map((item) => item.taka) }, companyId: user.companyId }, { status: "received" }),
    ]);
    return NextResponse.json({ success: true, data: receipt }, { status: 201 });
  } catch (err) {
    console.error("POST job-work-receipts error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: err?.code === 11000 ? 409 : 500 });
  }
}
