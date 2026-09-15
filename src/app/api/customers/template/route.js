import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

const columns = ["customerCode", "customerName", "customerGroup", "customerType", "emailId", "mobileNumber", "gstNumber", "gstCategory", "pan", "contactPersonName", "commissionRate", "paymentTerms", "billingAddress1", "billingAddress2", "billingCity", "billingState", "billingPin", "billingCountry", "shippingAddress1", "shippingAddress2", "shippingCity", "shippingState", "shippingPin", "shippingCountry", "glAccount"];
const example = ["", "Aarav Textiles", "Wholesale", "Business", "accounts@aaravtextiles.com", "9876543210", "22ABCDE1234F1Z5", "Registered Regular", "ABCDE1234F", "Aarav Sharma", "5", "30 Days", "Plot 21", "Industrial Area", "Mumbai", "Maharashtra", "400001", "India", "Warehouse 4", "MIDC", "Mumbai", "Maharashtra", "400002", "India", "Aarav Textiles Receivable"];
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET(req) {
  const user = verifyJWT(getTokenFromHeader(req));
  if (!user?.companyId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  if (!["view", "read", "download", "create", "import"].some((action) => hasPermission(user, "Customers", action))) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  const csv = [columns, example].map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(`\uFEFF${csv}`, { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="customer_bulk_upload_template.csv"',
    "Cache-Control": "no-store",
  }});
}
