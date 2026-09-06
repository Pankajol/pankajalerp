import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Fee from "@/models/school/Fee";
import Student from "@/models/school/Student";
import Staff from "@/models/school/Staff"; 
import CompanyUser from "@/models/CompanyUser";  
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth Helper ────────────────────────────────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.type === "school") return true;

  const allowedRoles = [
    "admin",
    "school admin",
    "principal",
    "teacher",
  ];

  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some((role) => 
    allowedRoles.includes(role.trim().toLowerCase())
  );
}

function schoolRole(user) {
  return (user?.schoolRole || user?.role || "").toLowerCase();
}

function isStudentOrParent(user) {
  return user?.type === "school" && ["student", "parent"].includes(schoolRole(user));
}

function canManageFees(user) {
  return user?.type === "company" || (user?.type !== "school" && user?.type !== undefined);
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

// ─── GET /api/school/fees ─────────────────────────────────────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const student = searchParams.get("student");
    const statusFilter = searchParams.get("status");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit")) || 20, 1), 100);

    const query = { companyId: user.companyId };
    if (isStudentOrParent(user)) query.student = user.id;

    if (student && !isStudentOrParent(user)) query.student = student;
    if (statusFilter && statusFilter !== "all") query.status = statusFilter;
    if (fromDate) query.dueDate = { $gte: new Date(fromDate) };
    if (toDate) {
      query.dueDate = {
        ...(query.dueDate || {}),
        $lte: new Date(toDate),
      };
    }

    const skip = (page - 1) * limit;

    const [fees, total] = await Promise.all([
      Fee.find(query)
        .populate("student", "firstName lastName studentId class section")
        .populate("collectedBy", "name")
        .sort({ dueDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Fee.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: fees,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Fees GET Error:", err);
    return NextResponse.json({
      success: false,
      message: "Server error",
    }, { status: 500 });
  }
}

// ─── POST /api/school/fees ────────────────────────────────────────────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    if (!canManageFees(user)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { student, feeHead, amount, dueDate, paymentMethod, remarks } = body;

    // Validation
    if (!student || !feeHead || !amount || !dueDate) {
      return NextResponse.json({
        success: false,
        message: "Missing required fields: student, feeHead, amount, dueDate",
      }, { status: 400 });
    }

    // Validate student exists and belongs to company
    const studentDoc = await Student.findOne({
      _id: student,
      companyId: user.companyId,
    });

    if (!studentDoc) {
      return NextResponse.json({
        success: false,
        message: "Student not found or unauthorized",
      }, { status: 404 });
    }

    // Generate unique receipt number
    const receiptNumber = `FEE-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 10000)}`;

    const fee = new Fee({
      student,
      feeHead: feeHead.trim(),
      amount: Number(amount),
      dueDate: new Date(dueDate),
      paymentMethod: paymentMethod || "cash",
      remarks: remarks?.trim() || "",
      receiptNumber,
      collectedBy: user.id || user._id,
      companyId: user.companyId,
      status: "pending",
    });

    await fee.save();
    await fee.populate("student", "firstName lastName studentId class section");

    return NextResponse.json({
      success: true,
      data: fee,
      message: "Fee record created successfully",
    });
  } catch (err) {
    console.error("Fee POST Error:", err);

    if (err.code === 11000) {
      return NextResponse.json({
        success: false,
        message: "Receipt number conflict. Please try again.",
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      message: err.message || "Failed to create fee record",
    }, { status: 500 });
  }
}
