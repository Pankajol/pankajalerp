import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Taka from "@/models/textiles/Taka";
import JobWorkChallan from "@/models/textiles/JobWorkChallan";
import JobWorkReceipt from "@/models/textiles/JobWorkReceipt";
import QCInspection from "@/models/textiles/QCInspection";
import "@/models/SupplierModels";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const taka = await Taka.findOne({ _id: id, companyId: user.companyId });
    if (!taka) return NextResponse.json({ success: false, message: "Taka not found" }, { status: 404 });

    // Get all related data
    const [challans, receipts, qcInspections] = await Promise.all([
      JobWorkChallan.find({ "items.taka": id, companyId: user.companyId })
        .populate("vendor", "supplierName")
        .select("challanNumber issuedDate status"),
      JobWorkReceipt.find({ "items.taka": id, companyId: user.companyId })
        .select("receiptNumber receivedDate totalReceivedQty commercialShrinkagePercent"),
      QCInspection.find({ taka: id, companyId: user.companyId })
        .select("inspectedDate grade finalResult inspector"),
    ]);

    // Build history timeline
    const history = [
      { event: "Taka Created", date: taka.createdAt, details: `Created by ${taka.createdBy?.name || "System"}` },
      { event: "Status Changed", date: taka.updatedAt, details: `Current status: ${taka.status}` },
      ...challans.map(c => ({ event: "Job Work Challan", date: c.issuedDate, details: `Challan ${c.challanNumber} to ${c.vendor?.supplierName || "Vendor"}` })),
      ...receipts.map(r => ({ event: "Job Work Receipt", date: r.receivedDate, details: `Received ${r.totalReceivedQty} Mtr (Shrinkage ${r.commercialShrinkagePercent}%)` })),
      ...qcInspections.map(q => ({ event: "QC Inspection", date: q.inspectedDate, details: `Grade ${q.grade} – ${q.finalResult}` })),
    ];

    // Sort by date descending
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    return NextResponse.json({ success: true, data: { taka, history } });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
