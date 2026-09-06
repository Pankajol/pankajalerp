import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DyeingRecipe from "@/models/textiles/DyeingRecipe";
import { validateUser } from "@/lib/auth";

export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const recipe = await DyeingRecipe.findOne({ _id: id, companyId: user.companyId })
      .populate("product", "itemName itemCode")
      .populate("ingredients.material", "itemName itemCode uom")
      .lean();
    if (!recipe) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: recipe });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const body = await req.json();
    if (Array.isArray(body.ingredients)) {
      body.ingredients = body.ingredients.map((item) => ({ ...item, quantity: Number(item.quantity ?? item.dosage ?? 0), dosage: Number(item.dosage ?? item.quantity ?? 0), unit: item.unit || item.dosageUom || "", dosageUom: item.dosageUom || item.unit || "", totalCost: Number(item.quantity ?? item.dosage ?? 0) * Number(item.costPerUnit || 0) }));
      body.totalCost = body.ingredients.reduce((sum, item) => sum + item.totalCost, 0);
    }
    if (body.status === "approved") { body.approvedBy = user.id || user._id; body.approvedAt = new Date(); }
    const updated = await DyeingRecipe.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      body,
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const deleted = await DyeingRecipe.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}
