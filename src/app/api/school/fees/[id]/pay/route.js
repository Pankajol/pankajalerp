import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Fee from "@/models/school/Fee";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers ────────────────────────────────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin", "project manager", "site engineer", "project coordinator",
    "site supervisor", "accounts manager", "purchase manager",
  ];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some((role) => allowedRoles.includes(role.trim().toLowerCase()));
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

export async function POST(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const body = await req.json();
    const { paymentMethod, remarks } = body;

    const fee = await Fee.findOne({ _id: id, companyId: user.companyId });
    if (!fee) {
      return NextResponse.json({ success: false, message: "Fee record not found" }, { status: 404 });
    }

    fee.status = "paid";
    fee.paidDate = new Date();
    fee.paymentMethod = paymentMethod || fee.paymentMethod || "cash";
    if (remarks) fee.remarks = remarks;
    fee.collectedBy = user.id || user._id;

    await fee.save();
    await fee.populate("student", "firstName lastName studentId");

    return NextResponse.json({
      success: true,
      data: fee,
      message: "Fee marked as paid",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}