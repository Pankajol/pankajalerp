import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Library from "@/models/school/Library";
import Borrowing from "@/models/school/Borrowing";
import { validateUser } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "GET");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const totalBooks = await Library.countDocuments({ companyId: user.companyId });
    const available = await Library.countDocuments({
      companyId: user.companyId,
      availableQuantity: { $gt: 0 },
    });

    const borrowed = await Borrowing.countDocuments({
      companyId: user.companyId,
      status: "borrowed",
    });

    const overdue = await Borrowing.countDocuments({
      companyId: user.companyId,
      status: "overdue",
    });

    return NextResponse.json({
      success: true,
      data: { totalBooks, available, borrowed, overdue },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}