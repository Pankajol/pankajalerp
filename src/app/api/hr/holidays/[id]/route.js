import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Holiday from "@/models/hr/Holiday";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const holiday = await Holiday.findOne({ _id: params.id, companyId: user.companyId });
    if (!holiday) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: holiday });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "holidays", "update"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    if (!body.title?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(body.date || "")) return NextResponse.json({ success: false, message: "Title and a valid date (YYYY-MM-DD) are required" }, { status: 400 });
    if (await Holiday.findOne({ companyId: user.companyId, date: body.date, _id: { $ne: params.id } })) return NextResponse.json({ success: false, message: "A holiday already exists on this date" }, { status: 409 });
    const holiday = await Holiday.findOneAndUpdate(
      { _id: params.id, companyId: user.companyId },
      body,
      { new: true, runValidators: true }
    );
    if (!holiday) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: holiday });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "holidays", "delete"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    await Holiday.findOneAndDelete({ _id: params.id, companyId: user.companyId });
    return NextResponse.json({ success: true, message: "Holiday deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
