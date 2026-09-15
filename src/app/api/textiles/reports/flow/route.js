import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import TextileDocument from "@/models/textiles/TextileDocument";
import { textileDoctypes } from "@/lib/textiles/doctypeConfig";

const processDoctypes = ["process-order", "dyeing-order", "printing-order", "finishing-order"];
const terminalStatuses = new Set(["completed", "closed", "cancelled", "sold", "rejected"]);

const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const processName = (record) => {
  if (record.doctype === "process-order") return record.data?.process || "General Process";
  return textileDoctypes[record.doctype]?.label || record.doctype;
};

export async function GET(req) {
  try {
    await dbConnect();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const records = await TextileDocument.find({ companyId: user.companyId })
      .sort({ updatedAt: -1 })
      .lean();

    const byDoctypeMap = new Map();
    const statusMap = new Map();
    const processMap = new Map();
    const shadeMap = new Map();
    const wasteMap = new Map();
    let totalInput = 0;
    let totalOutput = 0;
    let totalWaste = 0;
    let totalRejected = 0;
    let availableRolls = 0;
    let availableLength = 0;
    let productionCost = 0;
    let passedInspections = 0;
    let failedInspections = 0;

    for (const record of records) {
      byDoctypeMap.set(record.doctype, (byDoctypeMap.get(record.doctype) || 0) + 1);
      const status = String(record.status || "Draft");
      statusMap.set(status, (statusMap.get(status) || 0) + 1);

      const data = record.data || {};
      if (["production-batch", ...processDoctypes].includes(record.doctype)) {
        const input = number(data.input_qty);
        const output = number(data.actual_output_qty ?? data.output_qty);
        const waste = number(data.wastage_qty);
        const rejected = number(data.rejected_qty);
        totalInput += input;
        totalOutput += output;
        totalWaste += waste;
        totalRejected += rejected;

        const createdAt = new Date(record.createdAt);
        const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
        const month = createdAt.toLocaleString("en", { month: "short", year: "2-digit" });
        const monthly = wasteMap.get(monthKey) || { month, monthKey, input: 0, waste: 0 };
        monthly.input += input;
        monthly.waste += waste + rejected;
        wasteMap.set(month, monthly);
      }

      if (processDoctypes.includes(record.doctype)) {
        const name = processName(record);
        const current = processMap.get(name) || { process: name, planned: 0, done: 0, jobs: 0 };
        current.planned += number(data.planned_output_qty ?? data.input_qty);
        current.done += number(data.actual_output_qty ?? data.output_qty);
        current.jobs += 1;
        processMap.set(name, current);
      }

      if (record.doctype === "fabric-roll") {
        if (["available", "partially sold", "reserved"].includes(status.toLowerCase())) {
          availableRolls += 1;
          availableLength += number(data.length);
        }
        const shade = String(data.shade || "Unspecified");
        shadeMap.set(shade, (shadeMap.get(shade) || 0) + number(data.length || data.weight || 1));
      }

      if (record.doctype === "fabric-inspection") {
        if (status.toLowerCase() === "passed") passedInspections += 1;
        if (status.toLowerCase() === "failed") failedInspections += 1;
      }
      if (record.doctype === "production-cost-sheet") productionCost += number(data.net_production_cost);
    }

    const processWip = [...processMap.values()].map((row) => ({
      ...row,
      balance: Math.max(row.planned - row.done, 0),
      progress: row.planned > 0 ? Math.min(Math.round((row.done / row.planned) * 100), 100) : 0,
    }));
    const monthlyWaste = [...wasteMap.values()]
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map(({ monthKey, ...row }) => ({
        ...row,
        wastePercent: row.input > 0 ? Number(((row.waste / row.input) * 100).toFixed(2)) : 0,
      }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalDocuments: records.length,
          activeDocuments: records.filter((record) => !terminalStatuses.has(String(record.status).toLowerCase())).length,
          totalInput,
          totalOutput,
          totalWaste,
          totalRejected,
          wastePercent: totalInput > 0 ? Number((((totalWaste + totalRejected) / totalInput) * 100).toFixed(2)) : 0,
          availableRolls,
          availableLength,
          productionCost,
          passedInspections,
          failedInspections,
        },
        byDoctype: [...byDoctypeMap.entries()].map(([doctype, count]) => ({
          doctype,
          label: textileDoctypes[doctype]?.label || doctype,
          count,
        })).sort((a, b) => b.count - a.count),
        byStatus: [...statusMap.entries()].map(([name, value]) => ({ name, value })),
        processWip,
        monthlyWaste,
        shadeDistribution: [...shadeMap.entries()]
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10),
        recentDocuments: records.slice(0, 10).map((record) => ({
          _id: record._id,
          doctype: record.doctype,
          label: textileDoctypes[record.doctype]?.label || record.doctype,
          documentNumber: record.documentNumber,
          status: record.status,
          updatedAt: record.updatedAt,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
