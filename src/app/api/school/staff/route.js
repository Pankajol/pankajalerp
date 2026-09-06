import { NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import Staff from "@/models/school/Staff";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers ────────────────────────────────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.type === "school") return true;
  const allowedRoles = ["admin", "school admin", "principal", "teacher"];
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

function isPortalUser(user) {
  return user?.type === "school";
}

function schoolRole(user) {
  return (user?.schoolRole || user?.role || "").toLowerCase();
}

// ─── GET (list) ──────────────────────────────────────────────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit")) || 20, 1), 100);
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department") || "";
    const isActive = searchParams.get("isActive");

    const query = { companyId: user.companyId };
    if (isPortalUser(user)) {
      if (schoolRole(user) === "teacher") query._id = user.id;
      else query._id = null;
    }
    if (department) query.department = department;
    if (isActive === "true") query.isActive = true;
    else if (isActive === "false") query.isActive = false;

    if (search) {
      query.$or = [
        { staffId: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [staff, total] = await Promise.all([
      Staff.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Staff.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: staff,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ─── POST (create) ──────────────────────────────────────────────────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    if (isPortalUser(user)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();

    // Validate required fields
    const required = ["staffId", "firstName", "email", "gender", "designation"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Check duplicate staffId
    const existing = await Staff.findOne({
      staffId: body.staffId,
      companyId: user.companyId,
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Staff ID already exists" },
        { status: 409 }
      );
    }

    const { password, ...staffData } = body;
    const staff = new Staff({
      ...staffData,
      companyId: user.companyId,
      createdBy: user.id || user._id,
    });
    if (password) staff.passwordHash = await bcrypt.hash(password, 10);

    await staff.save();
    if (password) {
      await Staff.updateOne(
        { _id: staff._id },
        { $set: { passwordHash: staff.passwordHash } },
        { strict: false }
      );
    }
    const staffResponse = staff.toObject();
    delete staffResponse.passwordHash;

    return NextResponse.json({
      success: true,
      data: staffResponse,
      message: "Staff created successfully",
    });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Staff ID already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: err.message || "Creation failed" },
      { status: 500 }
    );
  }
}
