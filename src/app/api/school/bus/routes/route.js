import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BusRoute from "@/models/school/BusRoute";
import { validateUser } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "GET");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";

    const query = { companyId: user.companyId };
    if (search) query.name = { $regex: search, $options: "i" };

    const total = await BusRoute.countDocuments(query);
    const routes = await BusRoute.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: routes,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "POST");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    const route = await BusRoute.create({ ...body, companyId: user.companyId });
    return NextResponse.json({ success: true, data: route }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}