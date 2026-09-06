import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import QCInspection from "@/models/textiles/QCInspection";
import Taka from "@/models/textiles/Taka";
import "@/models/textiles/Design";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const result = searchParams.get("result") || "";
    const filter = { companyId: user.companyId };

    if (search) {
      filter.$or = [
        { inspectionNumber: { $regex: search, $options: "i" } },
        { "taka.takaNumber": { $regex: search, $options: "i" } },
      ];
    }
    if (result) filter.finalResult = result;

    const inspections = await QCInspection.find(filter)
      .populate("taka", "takaNumber quantity fabric design")
      .populate("design", "designCode description")
      .populate("inspector", "name")
      .populate("approvedBy", "name")
      .populate("parameters.parameter", "name code unit")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: inspections });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate Taka exists
    const taka = await Taka.findOne({ _id: body.taka, companyId: user.companyId });
    if (!taka) {
      return NextResponse.json({ success: false, message: "Taka not found" }, { status: 404 });
    }

    // Auto-calculate final result
    const hasFail = body.parameters?.some((p) => p.result === "fail") || false;
    const hasCritical = body.defects?.some((d) => d.severity === "critical") || false;
    const finalResult = body.finalResult && body.finalResult !== "pending" ? body.finalResult : (hasFail || hasCritical ? "fail" : "pass");

    // Auto-grade based on defects
    let grade = "A";
    const criticalCount = body.defects?.filter((d) => d.severity === "critical").length || 0;
    const majorCount = body.defects?.filter((d) => d.severity === "major").length || 0;

    if (body.grade) {
      grade = body.grade;
    } else if (criticalCount > 0 || finalResult === "fail") {
      grade = "Reject";
    } else if (majorCount > 3) {
      grade = "C";
    } else if (majorCount > 1) {
      grade = "B";
    } else if (majorCount === 0 && criticalCount === 0) {
      grade = "A";
    }

    const inspection = new QCInspection({
      ...body,
      design: body.design || taka.designRef || undefined,
      companyId: user.companyId,
      inspector: user.id,
      item: body.item || taka.fabric,
      batch: body.batch || taka.lot?.toString(),
      length: body.length ?? taka.quantity,
      width: body.width ?? taka.width,
      gsm: body.gsm ?? taka.gsm,
      finalResult,
      grade,
    });
    await inspection.save();

    // Update Taka status to "qc" or "available"
    if (finalResult === "pass") taka.status = "available";
    else if (finalResult === "hold") taka.status = "hold";
    else if (finalResult === "fail") taka.status = "rejected";
    else taka.status = "qc";
    await taka.save();

    return NextResponse.json({ success: true, data: inspection });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
