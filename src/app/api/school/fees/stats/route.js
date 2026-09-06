import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Fee from "@/models/school/Fee";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };

  try {
    const user = await verifyJWT(token);
    if (!user) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const query = { companyId: user.companyId };

    const [total, paid, pending, overdue] = await Promise.all([
      Fee.countDocuments(query),
      Fee.countDocuments({ ...query, status: "paid" }),
      Fee.countDocuments({ ...query, status: "pending" }),
      Fee.countDocuments({ ...query, status: "overdue" }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        total,
        paid,
        pending,
        overdue,
      },
    });
  } catch (err) {
    console.error("Fee Stats Error:", err);
    return NextResponse.json({
      success: false,
      message: "Failed to fetch statistics",
    }, { status: 500 });
  }
}