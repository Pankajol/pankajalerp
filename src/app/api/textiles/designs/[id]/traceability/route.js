import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Design from "@/models/textiles/Design";
import TextileBOM from "@/models/textiles/TextileBOM";
import JobWorkRequest from "@/models/textiles/JobWorkRequest";
import QCInspection from "@/models/textiles/QCInspection";
import Costing from "@/models/textiles/Costing";
import Taka from "@/models/textiles/Taka";
import ProductionOrder from "@/models/ppc/ProductionOrder";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );

    const { id } = await params;
    const companyId = user.companyId;
    const design = await Design.findOne({ _id: id, companyId })
      .populate("fabric", "itemCode itemName")
      .populate("qualityParameters", "code name method minValue maxValue unit")
      .lean();
    if (!design)
      return NextResponse.json(
        { success: false, message: "Design not found" },
        { status: 404 }
      );

    const takas = await Taka.find({
      companyId,
      $or: [{ designRef: id }, { design: design.designCode }],
    })
      .select(
        "takaNumber productionOrder fabric quantity status createdAt updatedAt"
      )
      .lean();
    const takaIds = takas.map((item) => item._id);

    const [boms, productionOrders, jobWorkRequests, inspections, costings] =
      await Promise.all([
        TextileBOM.find({ companyId, design: id })
          .populate("product", "itemCode itemName")
          .select("bomCode product components status createdAt updatedAt")
          .lean(),
        ProductionOrder.find({ companyId, design: id })
          .select(
            "orderNumber itemCode itemName quantity status createdAt updatedAt"
          )
          .lean(),
        JobWorkRequest.find({ companyId, design: id })
          .populate("vendor", "supplierCode supplierName")
          .select(
            "requestNumber vendor process takas status deliveryDate createdAt updatedAt"
          )
          .lean(),
        QCInspection.find({
          companyId,
          $or: [{ design: id }, { taka: { $in: takaIds } }],
        })
          .select(
            "inspectionNumber taka grade finalResult status inspectedDate createdAt updatedAt"
          )
          .lean(),
        Costing.find({
          companyId,
          $or: [{ design: id }, { taka: { $in: takaIds } }],
        })
          .select(
            "costingNumber taka productionOrder totalCost sellingPrice marginAmount marginPercentage status createdAt updatedAt"
          )
          .lean(),
      ]);

    const timeline = [
      ...boms.map((item) => ({
        type: "bom",
        date: item.createdAt,
        data: item,
      })),
      ...productionOrders.map((item) => ({
        type: "production-order",
        date: item.createdAt,
        data: item,
      })),
      ...jobWorkRequests.map((item) => ({
        type: "job-work-request",
        date: item.createdAt,
        data: item,
      })),
      ...takas.map((item) => ({
        type: "taka",
        date: item.createdAt,
        data: item,
      })),
      ...inspections.map((item) => ({
        type: "qc-inspection",
        date: item.inspectedDate || item.createdAt,
        data: item,
      })),
      ...costings.map((item) => ({
        type: "costing",
        date: item.createdAt,
        data: item,
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    return NextResponse.json({
      success: true,
      data: {
        design,
        boms,
        productionOrders,
        jobWorkRequests,
        takas,
        inspections,
        costings,
        timeline,
        summary: {
          boms: boms.length,
          productionOrders: productionOrders.length,
          jobWorkRequests: jobWorkRequests.length,
          takas: takas.length,
          inspections: inspections.length,
          passedInspections: inspections.filter(
            (item) => item.finalResult === "pass"
          ).length,
          totalCost: costings.reduce(
            (sum, item) => sum + (item.totalCost || 0),
            0
          ),
          totalMargin: costings.reduce(
            (sum, item) => sum + (item.marginAmount || 0),
            0
          ),
        },
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
