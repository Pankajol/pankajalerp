import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Design from "@/models/textiles/Design";
import QualityParameter from "@/models/textiles/QualityParameter";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function validateQualityParameters(ids, companyId) {
  if (ids === undefined || ids === null) return true;
  if (!Array.isArray(ids)) return false;
  if (ids.length === 0) return true;
  const uniqueIds = [...new Set(ids.map(String))];
  const count = await QualityParameter.countDocuments({
    _id: { $in: uniqueIds },
    companyId,
  });
  return count === uniqueIds.length;
}

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "";
    const filter = { companyId: user.companyId };
    if (status) filter.status = status;
    if (search) {
      const pattern = escapeRegex(search);
      filter.$or = [
        { designCode: { $regex: pattern, $options: "i" } },
        { description: { $regex: pattern, $options: "i" } },
        { category: { $regex: pattern, $options: "i" } },
      ];
    }

    const designs = await Design.find(filter)
      .populate("fabric", "itemCode itemName")
      .populate(
        "qualityParameters",
        "code name method minValue maxValue unit status"
      )
      .sort({ designCode: 1 })
      .lean();
    return NextResponse.json({ success: true, data: designs });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );

    const body = await req.json();
    if (!body.designCode?.trim() || !body.description?.trim()) {
      return NextResponse.json(
        { success: false, message: "Design code and description are required" },
        { status: 400 }
      );
    }
    if (
      !(await validateQualityParameters(body.qualityParameters, user.companyId))
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid quality parameter" },
        { status: 400 }
      );
    }

    const design = await Design.create({
      ...body,
      designCode: body.designCode.trim(),
      description: body.description.trim(),
      companyId: user.companyId,
      createdBy: user.id,
      updatedBy: user.id,
    });
    return NextResponse.json({ success: true, data: design }, { status: 201 });
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
