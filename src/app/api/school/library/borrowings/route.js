import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Borrowing from "@/models/school/Borrowing";
import Library from "@/models/school/Library";
import Student from "@/models/school/Student";

import { validateUser } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "GET");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const statusFilter = searchParams.get("status") || "all";
    const studentId = searchParams.get("student"); // optional: filter by student

    const query = { companyId: user.companyId };
    if (statusFilter !== "all") query.status = statusFilter;
    if (studentId) {
      // Try both _id and studentId formats
      if (mongoose.Types.ObjectId.isValid(studentId)) {
        query.student = studentId;
      } else {
        // If not a valid ObjectId, assume it's a studentId string – we need to lookup student
        // For simplicity, we'll use aggregation to join with Student
        // But we'll do a simple approach: find student by studentId first
        const Student = mongoose.model("Student");
        const studentDoc = await Student.findOne({ studentId });
        if (studentDoc) query.student = studentDoc._id;
        else return NextResponse.json({ success: true, data: [], meta: { total: 0, pages: 0 } });
      }
    }

    const total = await Borrowing.countDocuments(query);
    const borrowings = await Borrowing.find(query)
      .populate("book", "title author bookId")
      .populate("student", "firstName lastName studentId class")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ borrowedDate: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: borrowings,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}