import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Circular from "@/models/school/Circular";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin",
    "school admin",
    "principal",
    "teacher",
    "accounts manager",
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

export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const circular = await Circular.findOne({ _id: id, companyId: user.companyId })
      .populate("createdBy", "name")
      .lean();
    if (!circular) {
      return NextResponse.json({ success: false, message: "Circular not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: circular });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const body = await req.json();
    const circular = await Circular.findOne({ _id: id, companyId: user.companyId });
    if (!circular) {
      return NextResponse.json({ success: false, message: "Circular not found" }, { status: 404 });
    }

    const updatable = ["title", "content", "targetGroups", "attachments", "startDate", "endDate", "isActive", "priority"];
    for (const field of updatable) {
      if (body[field] !== undefined) {
        circular[field] = body[field];
      }
    }
    await circular.save();
    await circular.populate("createdBy", "name");
    return NextResponse.json({ success: true, data: circular });
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
    const circular = await Circular.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!circular) {
      return NextResponse.json({ success: false, message: "Circular not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Circular deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
