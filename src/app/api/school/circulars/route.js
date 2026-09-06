import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Circular from "@/models/school/Circular";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers ────────────────────────────────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.type === "school") return true;
  const allowedRoles = [
    "admin", "school admin", "principal", "teacher",
  ];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some((role) => allowedRoles.includes(role.trim().toLowerCase()));
}

function schoolRole(user) {
  return (user?.schoolRole || user?.role || "").toLowerCase();
}

function canManageCirculars(user) {
  return user?.type === "company" || schoolRole(user) === "teacher" || (user?.type !== "school" && user?.type !== undefined);
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

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit")) || 20, 1), 100);
    const targetGroup = searchParams.get("targetGroup") || "";
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search") || "";
    const priority = searchParams.get("priority") || "";

    const query = { companyId: user.companyId };
    if (targetGroup) query.targetGroups = { $in: [targetGroup] };
    if (isActive === "true") query.isActive = true;
    else if (isActive === "false") query.isActive = false;
    if (priority && priority !== "all") query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [circulars, total] = await Promise.all([
      Circular.find(query)
        .populate("createdBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Circular.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: circulars,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    if (!canManageCirculars(user)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const required = ["title", "content"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    // Ensure targetGroups is an array
    const targetGroups = body.targetGroups || ["all"];

    const circular = new Circular({
      title: body.title,
      content: body.content,
      targetGroups,
      attachments: body.attachments || [],
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      isActive: body.isActive !== undefined ? body.isActive : true,
      priority: body.priority || "medium",
      companyId: user.companyId,
      createdBy: user.id || user._id,
    });

    await circular.save();
    await circular.populate("createdBy", "name");
    return NextResponse.json({ success: true, data: circular });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
