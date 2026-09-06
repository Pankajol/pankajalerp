import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Library from "@/models/school/Library";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = ["admin", "school admin", "principal", "librarian"];
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

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
  }

  const book = await Library.findOne({ _id: id, companyId: user.companyId }).lean();
  if (!book) return NextResponse.json({ success: false, message: "Book not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: book });
}

export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const book = await Library.findOne({ _id: id, companyId: user.companyId });
    if (!book) return NextResponse.json({ success: false, message: "Book not found" }, { status: 404 });

    if (body.bookId && body.bookId !== book.bookId) {
      const existing = await Library.findOne({ bookId: body.bookId, companyId: user.companyId, _id: { $ne: id } });
      if (existing) {
        return NextResponse.json({ success: false, message: "Book ID already exists" }, { status: 409 });
      }
    }

    const updatable = [
      "bookId",
      "title",
      "author",
      "isbn",
      "category",
      "publisher",
      "edition",
      "year",
      "quantity",
      "availableQuantity",
      "shelfLocation",
      "coverImage",
      "description",
      "isActive",
    ];

    for (const field of updatable) {
      if (body[field] !== undefined) book[field] = body[field];
    }

    await book.save();
    return NextResponse.json({ success: true, data: book, message: "Book updated" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message || "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
  }

  const book = await Library.findOneAndDelete({ _id: id, companyId: user.companyId });
  if (!book) return NextResponse.json({ success: false, message: "Book not found" }, { status: 404 });

  return NextResponse.json({ success: true, message: "Book deleted" });
}
