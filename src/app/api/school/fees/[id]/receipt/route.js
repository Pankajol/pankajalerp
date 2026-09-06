import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Fee from "@/models/school/Fee";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };

  try {
    const user = await verifyJWT(token);
    if (!user) return { error: "Unauthorized", status: 403 };
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

    const fee = await Fee.findOne({
      _id: id,
      companyId: user.companyId,
    })
      .populate("student", "firstName lastName studentId class section")
      .populate("collectedBy", "name")
      .lean();

    if (!fee) {
      return NextResponse.json({
        success: false,
        message: "Fee record not found",
      }, { status: 404 });
    }

    // You can return HTML for printing or JSON for frontend rendering
     return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fee Receipt - ${fee.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: auto; }
          .receipt { border: 2px solid #000; padding: 30px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>School Fee Receipt</h1>
            <p>Receipt No: ${fee.receiptNumber}</p>
          </div>
          <p><strong>Student:</strong> ${fee.student.firstName} ${fee.student.lastName}</p>
          <p><strong>Class:</strong> ${fee.student.class}${fee.student.section ? `-${fee.student.section}` : ""}</p>
          <p><strong>Fee Head:</strong> ${fee.feeHead}</p>
          <p><strong>Amount:</strong> ₹${fee.amount}</p>
          <p><strong>Paid On:</strong> ${new Date(fee.paidDate || Date.now()).toLocaleDateString()}</p>
          <p><strong>Status:</strong> ${fee.status.toUpperCase()}</p>
        </div>
      </body>
      </html>
      `,
      {
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  } catch (err) {
    console.error("Receipt Error:", err);
    return NextResponse.json({
      success: false,
      message: "Failed to generate receipt",
    }, { status: 500 });
  }
}