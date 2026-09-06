import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
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
      const [vendorIds, requestIds] = await Promise.all([
        Supplier.find({ companyId: user.companyId, supplierName: { $regex: pattern, $options: "i" } }).distinct("_id"),
        JobWorkRequest.find({ companyId: user.companyId, requestNumber: { $regex: pattern, $options: "i" } }).distinct("_id"),
      ]);
      filter.$or = [
        { challanNumber: { $regex: pattern, $options: "i" } },
        { vendorChallanNo: { $regex: pattern, $options: "i" } },
        { process: { $regex: pattern, $options: "i" } },
        { vendor: { $in: vendorIds } },
        { request: { $in: requestIds } },
      ];
    }
    if (status) filter.status = status;

    const challans = await JobWorkChallan.find(filter)
      .populate("request", "requestNumber designCode customerName")
      .populate("vendor", "supplierName supplierCode emailId mobileNumber")
      .populate("fromWarehouse", "warehouseName warehouseCode")
      .populate("toWarehouse", "warehouseName warehouseCode")
      .populate("items.taka", "takaNumber quantity fabric design shade status")
      .sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: challans });
  } catch (err) {
    console.error("GET job-work-challans error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    if (!body.request) return NextResponse.json({ success: false, message: "Approved request is required" }, { status: 400 });

    const request = await JobWorkRequest.findOne({
      _id: body.request, companyId: user.companyId, status: "approved",
    });
    if (!request) return NextResponse.json({ success: false, message: "Approved request not found" }, { status: 404 });
    if (await JobWorkChallan.exists({ request: request._id, companyId: user.companyId })) {
      return NextResponse.json({ success: false, message: "A challan already exists for this request" }, { status: 409 });
    }

    let items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) {
      const takas = await Taka.find({ _id: { $in: request.takas }, companyId: user.companyId });
      items = takas.map((taka) => ({ taka: taka._id, quantity: taka.quantity, actualMeters: taka.quantity }));
    }
    if (!items.length || items.some((item) => !item.taka || Number(item.quantity) <= 0)) {
      return NextResponse.json({ success: false, message: "Every challan item needs a taka and positive quantity" }, { status: 400 });
    }
    const allowedTakas = new Set(request.takas.map(String));
    if (items.some((item) => !allowedTakas.has(String(item.taka)))) {
      return NextResponse.json({ success: false, message: "Challan contains a taka outside the request" }, { status: 400 });
    }

    const challan = await JobWorkChallan.create({
      ...body,
      items: items.map((item) => ({ ...item, quantity: Number(item.quantity) })),
      challanNumber: undefined,
      companyId: user.companyId,
      vendor: request.vendor,
      process: request.process,
      status: "draft",
      issuedBy: undefined,
      issuedAt: undefined,
    });
    return NextResponse.json({ success: true, data: challan }, { status: 201 });
  } catch (err) {
    console.error("POST job-work-challans error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: err?.code === 11000 ? 409 : 500 });
  }
}
