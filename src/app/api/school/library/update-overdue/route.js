import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Borrowing from "@/models/school/Borrowing";
import { validateUser } from "@/lib/auth";

// This can be triggered by a cron job or called manually
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "POST");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const now = new Date();
    const result = await Borrowing.updateMany(
      {
        companyId: user.companyId,
        status: "borrowed",
        dueDate: { $lt: now },
      },
      { status: "overdue" }
    );

    return NextResponse.json({
      success: true,
      message: `Updated ${result.modifiedCount} overdue records`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
} 