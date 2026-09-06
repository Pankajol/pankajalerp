import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/db";
import Student from "@/models/school/Student";
import Staff from "@/models/school/Staff";

const JWT_SECRET = process.env.JWT_SECRET;

function normalize(value) {
  return String(value || "").trim();
}

function publicStudent(student, role) {
  return {
    _id: student._id,
    id: student._id,
    studentId: student.studentId,
    name: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
    email: role === "parent" ? student.parent?.email : student.email,
    phone: role === "parent" ? student.parent?.phone : student.phone,
    role,
    type: "school",
    companyId: student.companyId,
    class: student.class,
    section: student.section,
    parent: role === "parent" ? student.parent : undefined,
  };
}

function publicStaff(staff) {
  return {
    _id: staff._id,
    id: staff._id,
    staffId: staff.staffId,
    name: `${staff.firstName || ""} ${staff.lastName || ""}`.trim(),
    email: staff.email,
    phone: staff.phone,
    role: "teacher",
    type: "school",
    companyId: staff.companyId,
    designation: staff.designation,
    department: staff.department,
  };
}

function signSchoolToken(profile) {
  return jwt.sign(
    {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      roles: [profile.role],
      type: "school",
      schoolRole: profile.role,
      companyId: profile.companyId,
      studentId: profile.studentId || null,
      staffId: profile.staffId || null,
      modules: { school: { selected: true, permissions: { view: true } } },
      permissions: [],
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export async function POST(req) {
  try {
    const { role, identifier, password } = await req.json();
    const schoolRole = normalize(role).toLowerCase();
    const loginId = normalize(identifier);

    if (!["student", "parent", "teacher"].includes(schoolRole)) {
      return NextResponse.json({ message: "Select student, parent, or teacher login" }, { status: 400 });
    }
    if (!loginId || !password) {
      return NextResponse.json({ message: "Login ID and password are required" }, { status: 400 });
    }

    await dbConnect();

    if (schoolRole === "teacher") {
      const staff = await Staff.collection.findOne({
        isActive: true,
        $or: [{ staffId: loginId }, { email: loginId.toLowerCase() }, { phone: loginId }],
      });

      if (staff && !staff.passwordHash) {
        return NextResponse.json({ message: "Teacher portal password is not set. Reset it from the staff edit page." }, { status: 401 });
      }
      if (!staff || !(await bcrypt.compare(password, staff.passwordHash))) {
        return NextResponse.json({ message: "Invalid teacher login credentials" }, { status: 401 });
      }

      const user = publicStaff(staff);
      return NextResponse.json({ token: signSchoolToken(user), user, schoolUser: user }, { status: 200 });
    }

    const student = await Student.collection.findOne({
      isActive: true,
      $or: [
        { studentId: loginId },
        { email: loginId.toLowerCase() },
        { phone: loginId },
        { "parent.email": loginId.toLowerCase() },
        { "parent.phone": loginId },
      ],
    });

    const hash = schoolRole === "parent" ? student?.parentPasswordHash : student?.passwordHash;
    if (student && !hash) {
      return NextResponse.json({
        message: `${schoolRole === "parent" ? "Parent" : "Student"} portal password is not set. Reset it from the student edit page.`,
      }, { status: 401 });
    }
    if (!student || !(await bcrypt.compare(password, hash))) {
      return NextResponse.json({ message: `Invalid ${schoolRole} login credentials` }, { status: 401 });
    }

    const user = publicStudent(student, schoolRole);
    return NextResponse.json({ token: signSchoolToken(user), user, schoolUser: user }, { status: 200 });
  } catch (err) {
    console.error("School Login Error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
