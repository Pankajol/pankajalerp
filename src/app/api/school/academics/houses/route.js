import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import House from "@/models/school/House";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers (copy from other routes) ──────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.type === "school") return true;
  const allowedRoles = ["admin", "school admin", "principal", "teacher"];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some((role) => allowedRoles.includes(role.trim().toLowerCase()));
}

function canManageHouses(user) {
  return user?.type === "company" || (user?.type !== "school" && user?.type !== undefined);
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

// ─── GET (list) ──────────────────────────────────────────────────────
export async function GET(req) {
  try {
    await dbConnect();
    const { user, error, status } = await validateUser(req);
    if (error) return NextResponse.json({ success: false, message: error }, { status });
    const houses = await House.find({ companyId: user.companyId })
      .populate("captain viceCaptain", "firstName lastName studentId")
      .sort({ name: 1 })
      .lean();
    return NextResponse.json({ success: true, data: houses });
  } catch (err) {
    console.error("GET /school/academics/houses error:", err);
    return NextResponse.json({
      success: false,
      message: "School data is temporarily unavailable. Please retry in a moment.",
    }, { status: 503 });
  }
}

// ─── POST (create) ──────────────────────────────────────────────────
export async function POST(req) {
  try {
    await dbConnect();
    const { user, error, status } = await validateUser(req);
    if (error) return NextResponse.json({ success: false, message: error }, { status });
    if (!canManageHouses(user)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ success: false, message: "Name is required" }, { status: 400 });
    }

    const house = new House({
      name: body.name,
      color: body.color || "#6366f1",
      motto: body.motto || "",
      captain: body.captain || null,
      viceCaptain: body.viceCaptain || null,
      companyId: user.companyId,
      createdBy: user.id || user._id,
    });

    await house.save();
    await house.populate("captain viceCaptain", "firstName lastName studentId");
    return NextResponse.json({ success: true, data: house });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
