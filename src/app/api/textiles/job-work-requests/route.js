import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import JobWorkRequest from "@/models/textiles/JobWorkRequest";
import JobWorkChallan from "@/models/textiles/JobWorkChallan";
import Taka from "@/models/textiles/Taka";
import Supplier from "@/models/SupplierModels";
import Design from "@/models/textiles/Design";
import "@/models/CustomerModel";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "";
    const withoutChallan = searchParams.get("withoutChallan") === "true";
    const filter = { companyId: user.companyId };
    if (search) {
      const pattern = escapeRegex(search);
      const vendorIds = await Supplier.find({
        companyId: user.companyId,
        $or: [
          { supplierName: { $regex: pattern, $options: "i" } },
          { supplierCode: { $regex: pattern, $options: "i" } },
        ],
      }).distinct("_id");
      const designIds = await Design.find({
        companyId: user.companyId,
        $or: [
          { designCode: { $regex: pattern, $options: "i" } },
          { description: { $regex: pattern, $options: "i" } },
        ],
      }).distinct("_id");
      filter.$or = [
        { requestNumber: { $regex: pattern, $options: "i" } },
        { process: { $regex: pattern, $options: "i" } },
        { designCode: { $regex: pattern, $options: "i" } },
        { design: { $in: designIds } },
        { customerName: { $regex: pattern, $options: "i" } },
        { vendor: { $in: vendorIds } },
      ];
    }
    if (status) filter.status = status;
    if (withoutChallan) {
      const usedRequestIds = await JobWorkChallan.find({ companyId: user.companyId }).distinct("request");
      filter._id = { $nin: usedRequestIds };
    }

    let requestsQuery = JobWorkRequest.find(filter)
      .populate("vendor", "supplierName supplierCode emailId mobileNumber")
      .populate("design", "designCode description status")
      .populate("takas", "takaNumber quantity fabric shade status")
      .sort({ createdAt: -1 });

    // During Next.js hot reload, Mongoose can retain the older compiled model.
    // Only populate customer when that running schema includes the path.
    if (JobWorkRequest.schema.path("customer")) {
      requestsQuery = requestsQuery.populate("customer", "customerCode customerName");
    }

    const requests = await requestsQuery.lean();
    const linkedChallans = await JobWorkChallan.find({
      companyId: user.companyId,
      request: { $in: requests.map((item) => item._id) },
    }).select("request challanNumber status").lean();
    const challanByRequest = new Map(linkedChallans.map((item) => [String(item.request), item]));
    const data = requests.map((item) => ({ ...item, linkedChallan: challanByRequest.get(String(item._id)) || null }));
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("GET job-work-requests error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.vendor || !body.design || !body.process?.trim() || !Array.isArray(body.takas) || body.takas.length === 0) {
      return NextResponse.json(
        { success: false, message: "Vendor, design, process and at least one taka are required" },
        { status: 400 }
      );
    }

    const [vendor, design, takas] = await Promise.all([
      Supplier.exists({ _id: body.vendor, companyId: user.companyId }),
      Design.findOne({ _id: body.design, companyId: user.companyId, status: "active" })
        .select("designCode description")
        .lean(),
      Taka.find({
        _id: { $in: body.takas }, companyId: user.companyId,
        status: { $in: ["available", "in-production"] },
      }).select("_id"),
    ]);
    if (!vendor) return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
    if (!design) return NextResponse.json({ success: false, message: "Active design not found" }, { status: 404 });

    const foundIds = new Set(takas.map((t) => t._id.toString()));
    const missingIds = body.takas.filter((id) => !foundIds.has(String(id)));
    if (missingIds.length) {
      return NextResponse.json(
        { success: false, message: "Some selected takas are no longer available", missingIds },
        { status: 400 }
      );
    }

    const request = await JobWorkRequest.create({
      ...body,
      designCode: design.designCode,
      designDescription: design.description,
      status: body.status === "submitted" ? "submitted" : "draft",
      requestNumber: undefined,
      companyId: user.companyId,
      createdBy: user.id,
    });
    return NextResponse.json({ success: true, data: request }, { status: 201 });
  } catch (err) {
    console.error("POST job-work-requests error:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err?.code === 11000 ? 409 : 500 }
    );
  }
}
