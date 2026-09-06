import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Borrowing from "@/models/school/Borrowing";
import { validateUser } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "GET");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "all";

    const query = { companyId: user.companyId };
    if (statusFilter !== "all") query.status = statusFilter;

    const borrowings = await Borrowing.find(query)
      .populate("book", "title author bookId")
      .populate("student", "firstName lastName studentId class")
      .lean();

    // Generate CSV
    const headers = ["Book ID", "Book Title", "Author", "Student ID", "Student Name", "Class", "Borrowed Date", "Due Date", "Returned Date", "Status"];
    const rows = borrowings.map((b) => [
      b.book?.bookId || "",
      b.book?.title || "",
      b.book?.author || "",
      b.student?.studentId || "",
      `${b.student?.firstName || ""} ${b.student?.lastName || ""}`,
      b.student?.class || "",
      new Date(b.borrowedDate).toLocaleDateString("en-GB"),
      new Date(b.dueDate).toLocaleDateString("en-GB"),
      b.returnedDate ? new Date(b.returnedDate).toLocaleDateString("en-GB") : "",
      b.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=library_borrowings_${new Date().toISOString().split("T")[0]}.csv`,
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}