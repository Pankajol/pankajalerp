import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import mongoose from "mongoose"; // <-- ADD THIS
import Library from "@/models/school/Library";
import Borrowing from "@/models/school/Borrowing";
import Student from "@/models/school/Student";
import { validateUser } from "@/lib/auth";

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "POST");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    const { bookId, studentId, dueDate } = body;

    if (!bookId || !studentId || !dueDate) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    // Verify book exists and has available copies
    const book = await Library.findOne({ _id: bookId, companyId: user.companyId });
    if (!book) {
      return NextResponse.json({ success: false, message: "Book not found" }, { status: 404 });
    }
    if (book.availableQuantity < 1) {
      return NextResponse.json({ success: false, message: "No copies available" }, { status: 400 });
    }

    // Verify student exists (supports both ObjectId and custom studentId)
    let studentDoc = null;
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      studentDoc = await Student.findOne({ _id: studentId, companyId: user.companyId });
    } else {
      studentDoc = await Student.findOne({ studentId, companyId: user.companyId });
    }
    if (!studentDoc) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }

    // Check if student already has this book borrowed
    const existingBorrowing = await Borrowing.findOne({
      book: book._id,
      student: studentDoc._id,
      status: "borrowed",
    });
    if (existingBorrowing) {
      return NextResponse.json({ success: false, message: "Student already has this book borrowed" }, { status: 400 });
    }

    // Decrease available quantity
    book.availableQuantity -= 1;
    await book.save();

    // Create borrowing record
    const borrowing = await Borrowing.create({
      companyId: user.companyId,
      book: book._id,
      student: studentDoc._id,
      dueDate: new Date(dueDate),
      status: "borrowed",
    });

    return NextResponse.json({ success: true, data: borrowing });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}