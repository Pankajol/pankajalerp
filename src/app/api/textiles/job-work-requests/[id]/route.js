import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import JobWorkRequest from "@/models/textiles/JobWorkRequest";
import JobWorkChallan from "@/models/textiles/JobWorkChallan";
import Taka from "@/models/textiles/Taka";
import Supplier from "@/models/SupplierModels";
import Design from "@/models/textiles/Design";
import "@/models/CustomerModel";

const editableFields = [
  "vendor", "customer", "process", "takas", "design",
  "customerCode", "customerName", "deliveryDesign", "deliveryDate", "notes", "status",
];

const getUser = (req) => verifyJWT(getTokenFromHeader(req));

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    let requestQuery = JobWorkRequest.findOne({ _id: id, companyId: user.companyId })
      .populate("vendor", "supplierName supplierCode emailId mobileNumber billingAddresses")
      .populate("design", "designCode description status")
      .populate("takas", "takaNumber quantity fabric shade status");
    if (JobWorkRequest.schema.path("customer")) {
      requestQuery = requestQuery.populate("customer", "customerCode customerName");
    }
    const request = await requestQuery;
    if (!request) return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
    const linkedChallan = await JobWorkChallan.findOne({ request: id, companyId: user.companyId })
      .select("challanNumber status")
      .lean();
    return NextResponse.json({ success: true, data: { ...request.toObject(), linkedChallan } });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const current = await JobWorkRequest.findOne({ _id: id, companyId: user.companyId });
    if (!current) return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
    if (!["draft", "submitted"].includes(current.status)) {
      return NextResponse.json({ success: false, message: "Only draft or submitted requests can be edited" }, { status: 400 });
    }

    const body = await req.json();
    const updates = Object.fromEntries(editableFields.filter((key) => key in body).map((key) => [key, body[key]]));
    if (updates.status && !["draft", "submitted"].includes(updates.status)) {
      return NextResponse.json({ success: false, message: "Invalid status change" }, { status: 400 });
    }
    const takaIds = updates.takas || current.takas;
    const vendorId = updates.vendor || current.vendor;
    const designId = updates.design || current.design;
    const process = updates.process === undefined ? current.process : updates.process;
    if (!vendorId || !designId || !process?.trim() || !takaIds.length) {
      return NextResponse.json({ success: false, message: "Vendor, design, process and at least one taka are required" }, { status: 400 });
    }

    const [vendor, design, takas] = await Promise.all([
      Supplier.exists({ _id: vendorId, companyId: user.companyId }),
      Design.findOne({ _id: designId, companyId: user.companyId })
        .select("designCode description")
        .lean(),
      Taka.find({
        _id: { $in: takaIds }, companyId: user.companyId,
        status: { $in: ["available", "in-production"] },
      }).select("_id"),
    ]);
    if (!vendor) return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
    if (!design) return NextResponse.json({ success: false, message: "Design not found" }, { status: 404 });
    if (takas.length !== takaIds.length) {
      return NextResponse.json({ success: false, message: "Some selected takas are no longer available" }, { status: 400 });
    }

    Object.assign(current, updates, {
      designCode: design.designCode,
      designDescription: design.description,
    });
    await current.save();
    await current.populate("vendor", "supplierName supplierCode emailId mobileNumber");
    await current.populate("design", "designCode description status");
    await current.populate("takas", "takaNumber quantity fabric shade status");
    return NextResponse.json({ success: true, data: current });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const request = await JobWorkRequest.findOne({ _id: id, companyId: user.companyId });
    if (!request) return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
    if (!["draft", "cancelled"].includes(request.status)) {
      return NextResponse.json({ success: false, message: "Only draft or cancelled requests can be deleted" }, { status: 400 });
    }
    if (await JobWorkChallan.exists({ request: id, companyId: user.companyId })) {
      return NextResponse.json({ success: false, message: "Delete the linked challan first" }, { status: 409 });
    }
    await request.deleteOne();
    return NextResponse.json({ success: true, message: "Request deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
