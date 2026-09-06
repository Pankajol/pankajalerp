import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Fee from "@/models/school/Fee";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth Helper ────────────────────────────────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;

  const allowedRoles = [
    "admin",
    "project manager",
    "site engineer",
    "project coordinator",
    "site supervisor",
    "accounts manager",
    "purchase manager",
  ];

  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some((role) => 
    allowedRoles.includes(role.trim().toLowerCase())
  );
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };

  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) {
      return { error: "Unauthorized access", status: 403 };
    }
    return { user };
  } catch (err) {
    return { error: "Invalid or expired token", status: 401 };
  }
}

// GET /api/school/fees/[id]
export async function GET(req, { params }) {
  await dbConnect();

  // Validate user
  const { user, error, status } = await validateUser(req);
  if (error) {
    return NextResponse.json({ success: false, message: error }, { status });
  }

  try {
    const { id } = await params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid fee ID" },
        { status: 400 }
      );
    }

    const fee = await Fee.findOne({ 
      _id: id, 
      companyId: user.companyId 
    })
      .populate("student", "firstName lastName studentId class section")
      .populate("collectedBy", "name email")
      .lean();

    if (!fee) {
      return NextResponse.json(
        { success: false, message: "Fee record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: fee,
    });
  } catch (err) {
    console.error("Fee Detail Error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const body = await req.json();

    const fee = await Fee.findOne({ _id: id, companyId: user.companyId });
    if (!fee) {
      return NextResponse.json({ success: false, message: "Fee record not found" }, { status: 404 });
    }

    // Allowed fields
    const updatable = ["feeHead", "amount", "dueDate", "paymentMethod", "remarks", "status"];
    for (const field of updatable) {
      if (body[field] !== undefined) {
        fee[field] = body[field];
      }
    }

    // If status is paid, set paidDate
    if (body.status === "paid" && fee.status !== "paid") {
      fee.paidDate = new Date();
    } else if (body.status === "pending") {
      fee.paidDate = null;
    }

    await fee.save();
    return NextResponse.json({
      success: true,
      data: fee,
      message: "Fee record updated",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const fee = await Fee.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!fee) {
      return NextResponse.json({ success: false, message: "Fee record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Fee record deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}