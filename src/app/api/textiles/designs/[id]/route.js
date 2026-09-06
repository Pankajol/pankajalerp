import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Design from "@/models/textiles/Design";
import TextileBOM from "@/models/textiles/TextileBOM";
import JobWorkRequest from "@/models/textiles/JobWorkRequest";
import QCInspection from "@/models/textiles/QCInspection";
import Costing from "@/models/textiles/Costing";
import ProductionOrder from "@/models/ppc/ProductionOrder";
import QualityParameter from "@/models/textiles/QualityParameter";
import Taka from "@/models/textiles/Taka";

const editableFields = [
  "designCode",
  "description",
  "fabric",
  "category",
  "weaveType",
  "repeatSize",
  "colors",
  "imageUrl",
  "qualityParameters",
  "notes",
  "status",
];

const getUser = (req) => verifyJWT(getTokenFromHeader(req));

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    const { id } = await params;
    const design = await Design.findOne({ _id: id, companyId: user.companyId })
      .populate("fabric", "itemCode itemName")
      .populate(
        "qualityParameters",
        "code name method minValue maxValue unit status"
      );
    if (!design)
      return NextResponse.json(
        { success: false, message: "Design not found" },
        { status: 404 }
      );
    return NextResponse.json({ success: true, data: design });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    const { id } = await params;
    const body = await req.json();
    const updates = Object.fromEntries(
      editableFields.filter((key) => key in body).map((key) => [key, body[key]])
    );
    if (updates.qualityParameters) {
      if (!Array.isArray(updates.qualityParameters)) {
        return NextResponse.json(
          { success: false, message: "Quality parameters must be an array" },
          { status: 400 }
        );
      }
      const ids = [...new Set(updates.qualityParameters.map(String))];
      const count = await QualityParameter.countDocuments({
        _id: { $in: ids },
        companyId: user.companyId,
      });
      if (count !== ids.length) {
        return NextResponse.json(
          { success: false, message: "Invalid quality parameter" },
          { status: 400 }
        );
      }
    }
    updates.updatedBy = user.id;
    const design = await Design.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      updates,
      { new: true, runValidators: true }
    );
    if (!design)
      return NextResponse.json(
        { success: false, message: "Design not found" },
        { status: 404 }
      );
    return NextResponse.json({ success: true, data: design });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message:
          err?.code === 11000 ? "Design code already exists" : err.message,
      },
      { status: err?.code === 11000 ? 409 : 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    const { id } = await params;
    const companyId = user.companyId;
    const [bom, request, order, inspection, costing, taka] = await Promise.all([
      TextileBOM.exists({ design: id, companyId }),
      JobWorkRequest.exists({ design: id, companyId }),
      ProductionOrder.exists({ design: id, companyId }),
      QCInspection.exists({ design: id, companyId }),
      Costing.exists({ design: id, companyId }),
      Taka.exists({ designRef: id, companyId }),
    ]);
    if (bom || request || order || inspection || costing || taka) {
      return NextResponse.json(
        {
          success: false,
          message: "Design is in use; mark it inactive or archived instead",
        },
        { status: 409 }
      );
    }
    const design = await Design.findOneAndDelete({ _id: id, companyId });
    if (!design)
      return NextResponse.json(
        { success: false, message: "Design not found" },
        { status: 404 }
      );
    return NextResponse.json({ success: true, message: "Design deleted" });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
