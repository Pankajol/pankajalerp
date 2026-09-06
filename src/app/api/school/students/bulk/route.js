import { NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import Student from "@/models/school/Student";
import House from "@/models/school/House";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = ["admin", "school admin", "principal", "teacher", "student", "parent"];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some((role) => allowedRoles.includes(role.trim().toLowerCase()));
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (user.type !== "company" && !isAuthorized(user)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { students } = body;

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { success: false, message: "Provide an array of students" },
        { status: 400 }
      );
    }

    // ✅ No 500-student limit – import any size

    const results = [];
    const errors = [];
    const houseCache = new Map();

    for (let i = 0; i < students.length; i++) {
      const data = students[i];
      try {
        // Required fields
        const required = ["studentId", "firstName", "dateOfBirth", "gender", "class"];
        for (const field of required) {
          if (!data[field]) {
            throw new Error(`Row ${i + 1}: Missing required field "${field}"`);
          }
        }

        // Duplicate check
        const existing = await Student.findOne({
          studentId: data.studentId,
          companyId: user.companyId,
        });
        if (existing) {
          throw new Error(`Row ${i + 1}: Student ID "${data.studentId}" already exists`);
        }

        // Legacy house (optional) – if not found, set null
        let houseId = null;
        if (data.house) {
          let houseDoc;
          if (mongoose.Types.ObjectId.isValid(data.house)) {
            houseDoc = await House.findOne({ _id: data.house, companyId: user.companyId });
          } else {
            const houseName = data.house.trim();
            if (houseCache.has(houseName)) {
              houseDoc = houseCache.get(houseName);
            } else {
              houseDoc = await House.findOne({
                name: { $regex: new RegExp(`^${houseName}$`, "i") },
                companyId: user.companyId,
              });
              if (houseDoc) houseCache.set(houseName, houseDoc);
            }
          }
          if (houseDoc) houseId = houseDoc._id;
          // if not found, houseId stays null
        }

        // New houseInfo
        const houseInfo = data.houseInfo || null;

        const { password, parentPassword, ...studentData } = data;

        // ✅ Convert dateOfBirth
        if (studentData.dateOfBirth) {
          const dob = new Date(studentData.dateOfBirth);
          if (isNaN(dob.getTime())) {
            throw new Error(`Row ${i + 1}: Invalid date format for dateOfBirth. Use YYYY-MM-DD.`);
          }
          studentData.dateOfBirth = dob;
        }

        const student = new Student({
          ...studentData,
          house: houseId,
          houseInfo: houseInfo,
          companyId: user.companyId,
          createdBy: user.id || user._id,
        });

        const pwd = password || "default123";
        const parentPwd = parentPassword || "default123";
        student.passwordHash = await bcrypt.hash(pwd, 10);
        student.parentPasswordHash = await bcrypt.hash(parentPwd, 10);

        await student.save();
        results.push(student);
      } catch (err) {
        errors.push(err.message);
      }
    }

    const response = {
      success: true,
      importedCount: results.length,
      message: `Imported ${results.length} students`,
    };
    if (errors.length) {
      response.errors = errors;
      response.message += `, ${errors.length} failed`;
    }

    return NextResponse.json(response, { status: errors.length ? 207 : 200 });
  } catch (err) {
    console.error("Bulk import error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Import failed" },
      { status: 500 }
    );
  }
}