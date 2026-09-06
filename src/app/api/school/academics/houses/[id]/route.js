import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import House from "@/models/school/House";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers ────────────────────────────────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company" || user.type === "school") return true;
  const allowedRoles = [
    "admin", "school admin", "principal", "teacher",
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

function canManageHouses(user) {
  if (user?.type === "company") return true;
  const roles = [user?.schoolRole, ...(user?.roles || [])]
    .filter(Boolean)
    .map((role) => String(role).trim().toLowerCase());
  return roles.some((role) => ["admin", "school admin", "principal", "teacher"].includes(role));
}

export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const house = await House.findOne({ _id: id, companyId: user.companyId })
      .populate("captain viceCaptain", "firstName lastName studentId")
      .lean();
    if (!house) {
      return NextResponse.json({ success: false, message: "House not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: house });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!canManageHouses(user)) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json();
    const house = await House.findOne({ _id: id, companyId: user.companyId });
    if (!house) {
      return NextResponse.json({ success: false, message: "House not found" }, { status: 404 });
    }

    const updatable = ["name", "color", "motto", "captain", "viceCaptain"];
    for (const field of updatable) {
      if (body[field] !== undefined) {
        house[field] = body[field];
      }
    }
    await house.save();
    return NextResponse.json({ success: true, data: house });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!canManageHouses(user)) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

  try {
    const { id } = await params;
    const house = await House.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!house) {
      return NextResponse.json({ success: false, message: "House not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "House deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
