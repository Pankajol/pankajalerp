import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Employee from "@/models/hr/Employee";
import CompanyUser from "@/models/CompanyUser";
import Department from "@/models/hr/Department";
import Designation from "@/models/hr/Designation";
import LeaveBalance from "@/models/hr/LeaveBalance";

const clean = (value) => String(value ?? "").trim();
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
function numberValue(value, field, errors) {
  if (clean(value) === "") return 0;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) errors.push(`${field} must be a number greater than or equal to 0`);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

export async function POST(req) {
  const user = verifyJWT(getTokenFromHeader(req));
  if (!user?.companyId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, "employees", "create")) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  try {
    await connectDB();
    const { employees } = await req.json();
    if (!Array.isArray(employees) || !employees.length) {
      return NextResponse.json({ success: false, message: "The upload contains no employee rows" }, { status: 400 });
    }
    if (employees.length > 1000) {
      return NextResponse.json({ success: false, message: "A maximum of 1,000 employees can be uploaded at once" }, { status: 400 });
    }

    const [departments, designations, hashedPassword] = await Promise.all([
      Department.find({ companyId: user.companyId }).lean(),
      Designation.find({ companyId: user.companyId }).lean(),
      bcrypt.hash("123456", 10),
    ]);
    const departmentMap = new Map(departments.map((row) => [row.name.toLowerCase(), row._id]));
    const designationMap = new Map(designations.map((row) => [row.title.toLowerCase(), row._id]));
    const createdDepartments = new Set();
    const createdDesignations = new Set();
    const results = [];

    for (let index = 0; index < employees.length; index += 1) {
      const row = employees[index] || {};
      const rowNumber = index + 2;
      const errors = [];
      const employeeCode = clean(row.employeeCode).toUpperCase();
      const fullName = clean(row.fullName);
      const email = clean(row.email).toLowerCase();
      const joiningDate = clean(row.joiningDate);
      const departmentName = clean(row.department);
      const designationName = clean(row.designation);
      const employmentType = clean(row.employmentType) || "Full-Time";
      const status = clean(row.status) || "Active";
      const gender = clean(row.gender);

      if (!employeeCode) errors.push("employeeCode is required");
      if (!fullName) errors.push("fullName is required");
      if (!email) errors.push("email is required");
      else if (!validEmail(email)) errors.push("email is invalid");
      if (!joiningDate || Number.isNaN(Date.parse(joiningDate))) errors.push("joiningDate must be a valid date");
      if (gender && !["Male", "Female", "Other"].includes(gender)) errors.push("gender must be Male, Female, or Other");
      if (!["Full-Time", "Part-Time", "Intern", "Contract"].includes(employmentType)) errors.push("employmentType is invalid");
      if (!["Active", "Inactive", "Resigned", "Terminated"].includes(status)) errors.push("status is invalid");
      const basic = numberValue(row.basicSalary, "basicSalary", errors);
      const hra = numberValue(row.hra, "hra", errors);
      const allowances = numberValue(row.allowances, "allowances", errors);
      if (errors.length) {
        results.push({ row: rowNumber, success: false, employeeCode, fullName, errors });
        continue;
      }

      let employee;
      try {
        const [duplicate, duplicateUser] = await Promise.all([
          Employee.findOne({ $or: [{ employeeCode }, { email }] }).select("employeeCode email").lean(),
          CompanyUser.exists({ email }),
        ]);
        if (duplicate || duplicateUser) {
          const reason = duplicate?.employeeCode === employeeCode ? "employeeCode already exists" : "email already exists";
          results.push({ row: rowNumber, success: false, employeeCode, fullName, errors: [reason] });
          continue;
        }

        let departmentCreated = false;
        let department = departmentName ? departmentMap.get(departmentName.toLowerCase()) : undefined;
        if (departmentName && !department) {
          const created = await Department.create({ companyId: user.companyId, name: departmentName });
          department = created._id;
          departmentMap.set(departmentName.toLowerCase(), department);
          createdDepartments.add(departmentName);
          departmentCreated = true;
        }
        let designationCreated = false;
        let designation = designationName ? designationMap.get(designationName.toLowerCase()) : undefined;
        if (designationName && !designation) {
          const created = await Designation.create({ companyId: user.companyId, title: designationName });
          designation = created._id;
          designationMap.set(designationName.toLowerCase(), designation);
          createdDesignations.add(designationName);
          designationCreated = true;
        }
        employee = await Employee.create({
          companyId: user.companyId, employeeCode, fullName, email,
          phone: clean(row.phone), gender: gender || undefined, dob: clean(row.dob) || undefined,
          department, designation, joiningDate, employmentType, status,
          salary: { basic, hra, allowances },
          bank: { accountNumber: clean(row.bankAccountNumber), ifsc: clean(row.ifsc).toUpperCase(), bankName: clean(row.bankName) },
          address: clean(row.address),
        });
        await LeaveBalance.create({ companyId: user.companyId, employeeId: employee._id });
        await CompanyUser.create({
          companyId: user.companyId, employeeId: employee._id, name: fullName, email,
          password: hashedPassword, roles: ["Employee"],
          modules: {
            employees: { selected: true, permissions: { view: true, create: false, edit: false, delete: false } },
            attendance: { selected: true, permissions: { view: true, create: true, edit: false, delete: false } },
            leaves: { selected: true, permissions: { view: true, create: true, edit: false, delete: false } },
            payroll: { selected: true, permissions: { view: true, create: false, edit: false, delete: false } },
            salary: { selected: true, permissions: { view: true, create: false, edit: false, delete: false } },
          },
        });
        results.push({
          row: rowNumber,
          success: true,
          employeeCode,
          fullName,
          warnings: [
            departmentCreated ? `Department '${departmentName}' was created` : "",
            designationCreated ? `Designation '${designationName}' was created` : "",
          ].filter(Boolean),
        });
      } catch (error) {
        if (employee?._id) {
          await Promise.allSettled([
            Employee.deleteOne({ _id: employee._id }),
            LeaveBalance.deleteOne({ employeeId: employee._id }),
            CompanyUser.deleteOne({ employeeId: employee._id }),
          ]);
        }
        results.push({ row: rowNumber, success: false, employeeCode, fullName, errors: [error?.code === 11000 ? "employeeCode or email already exists" : error.message || "Employee could not be created"] });
      }
    }

    const created = results.filter((row) => row.success).length;
    const failed = results.length - created;
    return NextResponse.json({
      success: created > 0,
      message: `Import complete: ${created} created, ${failed} failed`,
      summary: { total: results.length, created, failed },
      autoCreated: {
        departments: [...createdDepartments],
        designations: [...createdDesignations],
      },
      results,
    });
  } catch (error) {
    console.error("Employee bulk import error:", error);
    return NextResponse.json({ success: false, message: error.message || "Employee import failed" }, { status: 500 });
  }
}
