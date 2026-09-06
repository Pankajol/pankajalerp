import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Attendance from "@/models/hr/Attendance";
import Department from "@/models/hr/Department";
import Employee from "@/models/hr/Employee";
import Leave from "@/models/hr/Leave";
import Payroll from "@/models/hr/Payroll";
import Timesheet from "@/models/hr/Timesheet";

const canView = (user) => user?.type === "company" || [user?.role, ...(user?.roles || [])].some((r) => ["admin", "hr manager", "project manager"].includes(String(r?.name || r).trim().toLowerCase()));

export async function GET(request) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(request));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!canView(user)) return NextResponse.json({ success: false, message: "Not allowed to view HR reports" }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const today = new Date().toISOString().slice(0, 10);
    const startDate = searchParams.get("startDate") || `${today.slice(0, 8)}01`;
    const endDate = searchParams.get("endDate") || today;
    const departmentId = searchParams.get("departmentId") || "all";
    const companyId = user.companyId;
    const employeeQuery = { companyId, ...(departmentId !== "all" ? { department: departmentId } : {}) };
    const [departments, employees] = await Promise.all([
      Department.find({ companyId }).select("name").sort({ name: 1 }).lean(),
      Employee.find(employeeQuery).select("_id fullName employeeCode status").lean(),
    ]);
    const employeeIds = employees.map((e) => e._id);
    const attendanceFilter = { companyId, date: { $gte: startDate, $lte: endDate }, ...(departmentId !== "all" ? { employeeId: { $in: employeeIds } } : {}) };
    const [attendance, leaves, payroll, timesheets] = await Promise.all([
      Attendance.find(attendanceFilter).populate("employeeId", "fullName employeeCode").lean(),
      Leave.find({ companyId, employeeId: { $in: employeeIds }, fromDate: { $lte: new Date(`${endDate}T23:59:59.999Z`) }, toDate: { $gte: new Date(`${startDate}T00:00:00.000Z`) } }).populate("employeeId", "fullName employeeCode").lean(),
      Payroll.find({ companyId, employeeId: { $in: employeeIds }, month: { $gte: startDate.slice(0, 7), $lte: endDate.slice(0, 7) } }).populate("employeeId", "fullName employeeCode").lean(),
      Timesheet.find({ companyId, employeeId: { $in: employeeIds }, date: { $gte: new Date(`${startDate}T00:00:00.000Z`), $lte: new Date(`${endDate}T23:59:59.999Z`) } }).populate("employeeId", "fullName employeeCode").lean(),
    ]);
    return NextResponse.json({ success: true, data: {
      departments,
      summary: {
        employees: employees.length, activeEmployees: employees.filter((e) => e.status === "Active").length,
        attendanceRecords: attendance.length, present: attendance.filter((e) => e.status === "Present").length, late: attendance.filter((e) => e.isLate).length,
        leaveRequests: leaves.length, approvedLeaves: leaves.filter((e) => e.status === "Approved").length,
        payrollCount: payroll.length, payrollTotal: payroll.reduce((s, e) => s + (e.netSalary || 0), 0), paidPayroll: payroll.filter((e) => e.paidStatus === "Paid").length,
        timesheetHours: timesheets.filter((e) => e.status === "Approved").reduce((s, e) => s + (e.hours || 0), 0),
      }, rows: { attendance: attendance.slice(0, 50), leaves: leaves.slice(0, 50), payroll: payroll.slice(0, 50), timesheets: timesheets.slice(0, 50) },
    } });
  } catch (error) {
    console.error("GET /api/hr/reports error:", error);
    return NextResponse.json({ success: false, message: "Unable to generate HR reports" }, { status: 500 });
  }
}
