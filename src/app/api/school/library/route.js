import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Library from "@/models/school/Library";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers ────────────────────────────────────────────────────
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
  return userRoles.some((role) => allowedRoles.includes(role.trim().toLowerCase()));
}

function schoolRole(user) {
  return (user?.schoolRole || user?.role || "").toLowerCase();
}

function canManageLibrary(user) {
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
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const author = searchParams.get("author") || "";

    const query = { companyId: user.companyId };
    if (category) query.category = category;
    if (author) query.author = { $regex: author, $options: "i" };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { bookId: { $regex: search, $options: "i" } },
        { isbn: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [books, total] = await Promise.all([
      Library.find(query)
        .sort({ title: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Library.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: books,
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
    if (!canManageLibrary(user)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const required = ["bookId", "title", "author"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    // Check duplicate bookId
    const existing = await Library.findOne({ bookId: body.bookId, companyId: user.companyId });
    if (existing) {
      return NextResponse.json({ success: false, message: "Book ID already exists" }, { status: 409 });
    }

    const book = new Library({
      ...body,
      availableQuantity: body.quantity || 1,
      companyId: user.companyId,
      createdBy: user.id || user._id,
    });

    await book.save();
    return NextResponse.json({ success: true, data: book });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "Book ID already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
