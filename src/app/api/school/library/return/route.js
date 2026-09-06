import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Library from "@/models/school/Library";
import Borrowing from "@/models/school/Borrowing";
import { validateUser } from "@/lib/auth";

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "POST");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    const { borrowingId } = body;

    if (!borrowingId) {
      return NextResponse.json({ success: false, message: "Borrowing ID required" }, { status: 400 });
    }

    const borrowing = await Borrowing.findOne({
      _id: borrowingId,
      companyId: user.companyId,
      status: "borrowed",
    });
    if (!borrowing) {
      return NextResponse.json({ success: false, message: "Borrowing record not found or already returned" }, { status: 404 });
    }

    // Update book: increase available quantity
    const book = await Library.findOne({ _id: borrowing.book, companyId: user.companyId });
    if (book) {
      book.availableQuantity += 1;
      await book.save();
    }

    borrowing.returnedDate = new Date();
    // In the return route, after setting returnedDate
// Calculate fine: ₹5 per day overdue (configurable)
if (new Date() > borrowing.dueDate) {
  const daysOverdue = Math.ceil((new Date() - borrowing.dueDate) / (1000 * 60 * 60 * 24));
  borrowing.fine = daysOverdue * 5; // ₹5 per day
} else {
  borrowing.fine = 0;
}
    borrowing.status = "returned";
    await borrowing.save();

    return NextResponse.json({ success: true, data: borrowing });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}