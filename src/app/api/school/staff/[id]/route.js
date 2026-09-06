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
  const allowedRoles = [
    "admin",
    "school admin",
    "principal",
    "teacher",
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

function isPortalTeacher(user) {
  return user?.type === "school" && (user.schoolRole || user.role) === "teacher";
}

function isPortalUser(user) {
  return user?.type === "school";
}

// ─── GET (single) ────────────────────────────────────────────────────
export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }
    if (isPortalTeacher(user) && String(user.id) !== String(id)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const staff = await Staff.findOne({ _id: id, companyId: user.companyId }).lean();
    if (!staff) {
      return NextResponse.json({ success: false, message: "Staff not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: staff });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ─── PUT (update) ────────────────────────────────────────────────────
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    if (isPortalUser(user)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const staff = await Staff.findOne({ _id: id, companyId: user.companyId });
    if (!staff) {
      return NextResponse.json({ success: false, message: "Staff not found" }, { status: 404 });
    }

    // Allowed fields to update
    const updatable = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "gender",
      "dateOfBirth",
      "joiningDate",
      "designation",
      "department",
      "qualifications",
      "workExperience",
      "address",
      "emergencyContact",
      "isActive",
    ];
    for (const field of updatable) {
      if (body[field] !== undefined) {
        staff[field] = body[field];
      }
    }
    let passwordHash = null;
    if (body.password) {
      passwordHash = await bcrypt.hash(body.password, 10);
      staff.passwordHash = passwordHash;
    }

    await staff.save();
    if (passwordHash) {
      await Staff.updateOne(
        { _id: staff._id },
        { $set: { passwordHash } },
        { strict: false }
      );
    }
    const staffResponse = staff.toObject();
    delete staffResponse.passwordHash;
    return NextResponse.json({
      success: true,
      data: staffResponse,
      message: "Staff updated successfully",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: err.message || "Update failed" },
      { status: 500 }
    );
  }
}

// ─── DELETE (soft delete) ───────────────────────────────────────────
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    if (isPortalUser(user)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const staff = await Staff.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { isActive: false },
      { new: true }
    );
    if (!staff) {
      return NextResponse.json({ success: false, message: "Staff not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Staff disabled" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: err.message || "Delete failed" },
      { status: 500 }
    );
  }
}

// ─── Enable Staff ──────────────────────────────────────────────────
export async function PATCH(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    if (isPortalUser(user)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const { action } = await req.json();
    if (action === "enable") {
      const staff = await Staff.findOneAndUpdate(
        { _id: id, companyId: user.companyId },
        { isActive: true },
        { new: true }
      );
      if (!staff) {
        return NextResponse.json({ success: false, message: "Staff not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: staff, message: "Staff enabled" });
    }
    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
