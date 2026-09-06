import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import ExportDocumentation from "@/models/textiles/ExportDocumentation";
import Taka from "@/models/textiles/Taka";
import Customer from "@/models/CustomerModel";

export async function POST(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { takaId } = params;
    const body = await req.json();

    // Get Taka details
    const taka = await Taka.findOne({ _id: takaId, companyId: user.companyId })
      .populate("fabric", "itemName itemCode")
      .populate("productionOrder", "orderNumber")
      .populate("customer", "name code");

    if (!taka) {
      return NextResponse.json({ success: false, message: "Taka not found" }, { status: 404 });
    }

    // Get customer details
    const customer = await Customer.findOne({
      _id: body.customerId || taka.customer,
      companyId: user.companyId,
    });

    // Build export document
    const doc = new ExportDocumentation({
      companyId: user.companyId,
      exportNumber: `EXP-${Date.now()}`,
      takas: [takaId],
      customer: customer?._id || body.customerId,
      customerReference: body.customerReference || "",
      shippedDate: body.shippedDate || new Date(),
      shippingMethod: body.shippingMethod || "sea",
      shippingCompany: body.shippingCompany || "",
      billOfLading: body.billOfLading || "",
      vesselName: body.vesselName || "",
      voyageNumber: body.voyageNumber || "",
      portOfLoading: body.portOfLoading || "",
      portOfDischarge: body.portOfDischarge || "",
      containerNumber: body.containerNumber || "",
      sealNumber: body.sealNumber || "",
      invoiceNumber: body.invoiceNumber || `INV-${Date.now()}`,
      invoiceDate: body.invoiceDate || new Date(),
      invoiceValue: body.invoiceValue || 0,
      currency: body.currency || "USD",
      incoterms: body.incoterms || "FOB",
      paymentTerms: body.paymentTerms || "",
      shippingMarks: body.shippingMarks || [{ markNumber: "1", description: "Fabric Rolls", cartons: 1 }],
      status: "draft",
      createdBy: user.id,
    });
    await doc.save();

    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error("Generate export docs error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
