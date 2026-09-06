import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Borrowing from "@/models/school/Borrowing";
import { validateUser } from "@/lib/auth";

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "POST");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { borrowingId } = await req.json();
    const borrowing = await Borrowing.findOne({
      _id: borrowingId,
      companyId: user.companyId,
    });
    if (!borrowing) {
      return NextResponse.json({ success: false, message: "Borrowing not found" }, { status: 404 });
    }
    if (borrowing.fine <= 0) {
      return NextResponse.json({ success: false, message: "No fine to pay" }, { status: 400 });
    }

    borrowing.finePaid = true;
    await borrowing.save();

    return NextResponse.json({ success: true, message: "Fine paid successfully" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}