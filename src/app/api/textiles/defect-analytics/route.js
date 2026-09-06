import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import QCInspection from "@/models/textiles/QCInspection";
import Taka from "@/models/textiles/Taka";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const machine = searchParams.get("machine") || "";
    const operator = searchParams.get("operator") || "";

    // Build filter
    const filter = { companyId: user.companyId };
    if (dateFrom || dateTo) {
      filter.inspectedDate = {};
      if (dateFrom) filter.inspectedDate.$gte = new Date(dateFrom);
      if (dateTo) filter.inspectedDate.$lte = new Date(dateTo);
    }

    // Get all QC inspections with defects
    const inspections = await QCInspection.find(filter)
      .populate("taka", "takaNumber status")
      .populate("inspector", "name");

    // Extract defects with related info
    let allDefects = [];
    let totalTakas = 0;
    let passTakas = 0;
    let failTakas = 0;
    const defectCounts = {};
    const severityCounts = { minor: 0, major: 0, critical: 0 };
    const machineDefects = {};
    const operatorDefects = {};
    const dailyDefects = {};
    const gradeCounts = { A: 0, B: 0, C: 0, D: 0, Reject: 0 };

    for (const inspection of inspections) {
      totalTakas++;
      if (inspection.finalResult === "pass") passTakas++;
      else failTakas++;

      if (inspection.grade) {
        gradeCounts[inspection.grade] = (gradeCounts[inspection.grade] || 0) + 1;
      }

      // Process defects
      if (inspection.defects && inspection.defects.length > 0) {
        for (const defect of inspection.defects) {
          allDefects.push({
            ...defect,
            inspectionId: inspection._id,
            taka: inspection.taka,
            inspector: inspection.inspector,
            date: inspection.inspectedDate,
            grade: inspection.grade,
          });

          // Count by type
          defectCounts[defect.type] = (defectCounts[defect.type] || 0) + 1;

          // Count by severity
          if (defect.severity) {
            severityCounts[defect.severity] = (severityCounts[defect.severity] || 0) + 1;
          }

          // Daily trends
          const dateKey = new Date(inspection.inspectedDate).toISOString().split("T")[0];
          dailyDefects[dateKey] = (dailyDefects[dateKey] || 0) + 1;
        }
      }
    }

    // Machine-wise defects (if we have machine mapping)
    // For now, we'll just count by taka's production order or fabric

    // Prepare Pareto data (top defects)
    const paretoData = Object.entries(defectCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Add cumulative percentages for Pareto
    let cumulative = 0;
    const totalDefects = paretoData.reduce((sum, d) => sum + d.count, 0);
    const paretoWithCum = paretoData.map((d) => {
      cumulative += d.count;
      return {
        ...d,
        percentage: totalDefects > 0 ? Math.round((d.count / totalDefects) * 100) : 0,
        cumulative: totalDefects > 0 ? Math.round((cumulative / totalDefects) * 100) : 0,
      };
    });

    // Defect trend (daily)
    const trendData = Object.entries(dailyDefects)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Overall summary
    const summary = {
      totalInspections: inspections.length,
      totalTakas,
      passTakas,
      failTakas,
      passRate: totalTakas > 0 ? Math.round((passTakas / totalTakas) * 100) : 0,
      totalDefects: allDefects.length,
      uniqueDefectTypes: Object.keys(defectCounts).length,
      defectPerTaka: totalTakas > 0 ? (allDefects.length / totalTakas).toFixed(2) : 0,
      severityBreakdown: severityCounts,
      gradeDistribution: gradeCounts,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        pareto: paretoWithCum,
        trend: trendData,
        defectCounts,
        severityCounts,
        gradeCounts,
        allDefects: allDefects.slice(0, 100), // limit for performance
      },
    });
  } catch (err) {
    console.error("Defect analytics error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
