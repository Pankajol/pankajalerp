import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import TextileDocument from "@/models/textiles/TextileDocument";
import { textileDoctypes } from "@/lib/textiles/doctypeConfig";

const processDoctypes = ["process-order", "dyeing-order", "printing-order", "finishing-order"];
const terminalStatuses = new Set(["completed", "cancelled", "closed"]);
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export async function GET(req) {
  try {
    await dbConnect();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const [records, processMasters, batchCount] = await Promise.all([
      TextileDocument.find({ companyId: user.companyId, doctype: { $in: processDoctypes } }).sort({ updatedAt: -1 }).lean(),
      TextileDocument.find({ companyId: user.companyId, doctype: "textile-process" }).lean(),
      TextileDocument.countDocuments({ companyId: user.companyId, doctype: "production-batch" }),
    ]);
    const masterNames = new Map(processMasters.map((record) => [String(record._id), record.data?.process_name || record.documentNumber]));
    const grouped = new Map();

    for (const record of records) {
      const data = record.data || {};
      const rawProcess = data.process?._id || data.process;
      const process = record.doctype === "process-order"
        ? masterNames.get(String(rawProcess)) || data.process_name || rawProcess || "General Process"
        : textileDoctypes[record.doctype]?.label || record.doctype;
      const planned = number(data.planned_output_qty ?? data.input_qty);
      const done = number(data.actual_output_qty ?? data.output_qty);
      const status = String(record.status || "Draft");
      const row = grouped.get(process) || { process, planned: 0, done: 0, documentCount: 0, activeCount: 0, statuses: new Map() };
      row.planned += planned;
      row.done += done;
      row.documentCount += 1;
      if (!terminalStatuses.has(status.toLowerCase())) row.activeCount += 1;
      row.statuses.set(status, (row.statuses.get(status) || 0) + 1);
      grouped.set(process, row);
    }

    const processes = [...grouped.values()].map((row) => ({
      process: row.process,
      planned: row.planned,
      done: row.done,
      balance: Math.max(row.planned - row.done, 0),
      documentCount: row.documentCount,
      activeCount: row.activeCount,
      statuses: [...row.statuses.entries()].map(([name, value]) => ({ name, value })),
      progress: row.planned > 0 ? Math.min(Math.round((row.done / row.planned) * 100), 100) : 0,
    })).sort((a, b) => b.activeCount - a.activeCount || b.planned - a.planned || a.process.localeCompare(b.process));

    const totalPlanned = processes.reduce((sum, row) => sum + row.planned, 0);
    const totalDone = processes.reduce((sum, row) => sum + row.done, 0);
    return NextResponse.json({
      success: true,
      data: {
        processes,
        summary: {
          totalPlanned,
          totalDone,
          totalBalance: Math.max(totalPlanned - totalDone, 0),
          overallProgress: totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0,
          processCount: processes.length,
          activeProcesses: processes.filter((row) => row.activeCount > 0).length,
          productionBatches: batchCount,
        },
        recentDocuments: records.slice(0, 10).map((record) => ({
          _id: record._id,
          doctype: record.doctype,
          label: textileDoctypes[record.doctype]?.label || record.doctype,
          documentNumber: record.documentNumber,
          status: record.status || "Draft",
          updatedAt: record.updatedAt,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
