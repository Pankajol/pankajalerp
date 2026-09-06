import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import ProductionJobCard from "@/models/ppc/ProductionJobCard"; // adjust path as per your model
import MachineOutput from "@/models/ppc/machineOutputModel";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const processFilter = searchParams.get("process") || null;
    const companyFilter = { companyId: user.companyId };

    // Define the standard textile processes
    const processes = [
      "Warping",
      "Sizing",
      "Weaving",
      "Greige Folding",
      "Dyeing",
      "Printing",
      "Finishing",
      "Inspection",
      "Packing",
    ];

    // If a specific process is requested, filter
    const targetProcesses = processFilter ? [processFilter] : processes;

    // Aggregate job cards
    // Assuming ProductionJobCard has fields: operation, plannedQuantity, completedQuantity, status
    const pipeline = [
      { $match: companyFilter },
      { $group: {
        _id: "$operation",
        totalPlanned: { $sum: "$plannedQuantity" },
        totalCompleted: { $sum: "$completedQuantity" },
        jobCardCount: { $sum: 1 },
        statuses: { $addToSet: "$status" },
      }},
    ];

    const jobCardAgg = await ProductionJobCard.aggregate(pipeline);

    // Build a map of process -> { planned, done, balance, jobCardCount, statuses }
    const processMap = {};
    for (const item of jobCardAgg) {
      const processName = item._id || "Unknown";
      const planned = item.totalPlanned || 0;
      const done = item.totalCompleted || 0;
      const balance = planned - done;
      processMap[processName] = {
        planned,
        done,
        balance,
        jobCardCount: item.jobCardCount || 0,
        statuses: item.statuses || [],
      };
    }

    // Fill missing processes with zero
    const result = targetProcesses.map((p) => ({
      process: p,
      planned: processMap[p]?.planned || 0,
      done: processMap[p]?.done || 0,
      balance: processMap[p]?.balance || 0,
      jobCardCount: processMap[p]?.jobCardCount || 0,
      statuses: processMap[p]?.statuses || [],
    }));

    // Sort: show those with active work first (planned > 0)
    result.sort((a, b) => (b.planned > 0 ? 1 : 0) - (a.planned > 0 ? 1 : 0));

    // Also calculate overall summary
    const totalPlanned = result.reduce((sum, r) => sum + r.planned, 0);
    const totalDone = result.reduce((sum, r) => sum + r.done, 0);
    const totalBalance = totalPlanned - totalDone;
    const overallProgress = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0;

    // Optionally, fetch recent machine outputs to show latest activity (optional)
    const recentOutputs = await MachineOutput.find(companyFilter)
      .sort({ date: -1 })
      .limit(5)
      .populate("jobCard", "operation")
      .select("quantity date jobCard");

    return NextResponse.json({
      success: true,
      data: {
        processes: result,
        summary: {
          totalPlanned,
          totalDone,
          totalBalance,
          overallProgress,
          processCount: result.length,
          activeProcesses: result.filter(r => r.planned > 0).length,
        },
        recentOutputs,
      },
    });
  } catch (err) {
    console.error("Process WIP error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
