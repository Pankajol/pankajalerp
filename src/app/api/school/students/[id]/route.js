import { NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import Student from "@/models/school/Student";
import House from "@/models/school/House";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers (reuse) ──────────────────────────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = ["admin", "school admin", "principal", "teacher", "student", "parent"];
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
// ─────────────────────────────────────────────────────────────────────

// ─── GET (single) ────────────────────────────────────────────────────
export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const student = await Student.findOne({
      _id: id,
      companyId: user.companyId,
    })
      .populate("house", "name color")
      .populate("siblings", "firstName lastName studentId")
      .lean();

    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: student });
  } catch (err) {
    console.error("GET /school/students/[id] error:", err);
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

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();

    // Check if student exists and belongs to this company
    const existingStudent = await Student.findOne({
      _id: id,
      companyId: user.companyId,
    });
    if (!existingStudent) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }

    // Validate required fields (same as create)
    const required = ["firstName", "dateOfBirth", "gender", "class"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // If old `house` (ObjectId) is provided, validate it (backward compatibility)
    if (body.house) {
      const houseDoc = await House.findOne({
        _id: body.house,
        companyId: user.companyId,
      });
      if (!houseDoc) {
        return NextResponse.json(
          { success: false, message: "House not found" },
          { status: 400 }
        );
      }
    }

    // Validate siblings
    if (body.siblings && body.siblings.length > 0) {
      const siblings = await Student.find({
        _id: { $in: body.siblings },
        companyId: user.companyId,
      }).lean();
      if (siblings.length !== body.siblings.length) {
        return NextResponse.json(
          { success: false, message: "One or more siblings not found" },
          { status: 400 }
        );
      }
    }

    // Extract passwords and houseInfo
    const { password, parentPassword, houseInfo, ...updateData } = body;

    // Build update object
    const updateFields = { ...updateData };

    // Handle houseInfo: if provided as object, set it; if null, unset it
    if (houseInfo !== undefined) {
      if (houseInfo === null) {
        updateFields.$unset = { houseInfo: "" };
      } else if (typeof houseInfo === "object") {
        updateFields.houseInfo = houseInfo;
      }
    }

    // Hash passwords if provided
    if (password) {
      updateFields.passwordHash = await bcrypt.hash(password, 10);
    }
    if (parentPassword) {
      updateFields.parentPasswordHash = await bcrypt.hash(parentPassword, 10);
    }

    // Perform update
    const updated = await Student.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).populate("house", "name color");

    if (!updated) {
      return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
    }

    const studentResponse = updated.toObject();
    delete studentResponse.passwordHash;
    delete studentResponse.parentPasswordHash;

    return NextResponse.json({
      success: true,
      data: studentResponse,
      message: "Student updated successfully",
    });
  } catch (err) {
    console.error("PUT /school/students/[id] error:", err);
    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Student ID already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: err.message || "Update failed" },
      { status: 500 }
    );
  }
}

// ─── DELETE (soft delete – toggle isActive) ────────────────────────
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    if (isPortalUser(user)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const student = await Student.findOne({
      _id: id,
      companyId: user.companyId,
    });
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }

    // Toggle active status
    student.isActive = !student.isActive;
    await student.save();

    return NextResponse.json({
      success: true,
      data: { isActive: student.isActive },
      message: `Student ${student.isActive ? "enabled" : "disabled"} successfully`,
    });
  } catch (err) {
    console.error("DELETE /school/students/[id] error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Action failed" },
      { status: 500 }
    );
  }
}