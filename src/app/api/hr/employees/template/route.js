import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

const columns = ["employeeCode", "fullName", "email", "phone", "gender", "dob", "department", "designation", "joiningDate", "employmentType", "status", "basicSalary", "hra", "allowances", "bankAccountNumber", "ifsc", "bankName", "address"];
const example = ["EMP-001", "Aarav Sharma", "aarav.sharma@example.com", "+91 9876543210", "Male", "1995-06-15", "Sales", "Sales Executive", "2026-09-12", "Full-Time", "Active", "30000", "12000", "3000", "123456789012", "SBIN0001234", "State Bank of India", "New Delhi, India"];
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET(req) {
  const user = verifyJWT(getTokenFromHeader(req));
  if (!user?.companyId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, "employees", "create")) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  const csv = [columns, example].map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(`\uFEFF${csv}`, { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="employee_bulk_upload_template.csv"',
    "Cache-Control": "no-store",
  }});
}
