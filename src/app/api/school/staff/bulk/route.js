import { NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import Staff from "@/models/school/Staff";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers ────────────────────────────────────────────────────
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

// ─── Helper: sanitize gender ─────────────────────────────────────────
function sanitizeGender(value) {
  const lower = (value || "").trim().toLowerCase();
  const valid = ["male", "female", "other"];
  if (valid.includes(lower)) return lower;
  return "male"; // default
}

// ─── POST (bulk import) ─────────────────────────────────────────────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  // Only company users (admin/school admin) can bulk import
  if (user.type !== "company" && !isAuthorized(user)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { staff } = body;

    if (!Array.isArray(staff) || staff.length === 0) {
      return NextResponse.json(
        { success: false, message: "Provide an array of staff members" },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < staff.length; i++) {
      const data = staff[i];
      try {
        // ── Validate required fields ──
        const required = ["staffId", "firstName", "email", "gender", "designation"];
        for (const field of required) {
          if (!data[field]) {
            throw new Error(`Row ${i + 1}: Missing required field "${field}"`);
          }
        }

        // Validate email format
        if (!/\S+@\S+\.\S+/.test(data.email)) {
          throw new Error(`Row ${i + 1}: Invalid email format`);
        }

        // ── Check duplicate staffId ──
        const existing = await Staff.findOne({
          staffId: data.staffId,
          companyId: user.companyId,
        });
        if (existing) {
          throw new Error(`Row ${i + 1}: Staff ID "${data.staffId}" already exists`);
        }

        // ── Sanitize gender ──
        data.gender = sanitizeGender(data.gender);

        // ── Parse dates ──
        let dateOfBirth = null;
        if (data.dateOfBirth) {
          const dob = new Date(data.dateOfBirth);
          if (!isNaN(dob.getTime())) dateOfBirth = dob;
          // silently ignore invalid date
        }

        let joiningDate = null;
        if (data.joiningDate) {
          const jd = new Date(data.joiningDate);
          if (!isNaN(jd.getTime())) joiningDate = jd;
        }

        // ── Prepare nested fields ──
        // qualifications and workExperience are arrays; we keep them empty unless provided
        const qualifications = Array.isArray(data.qualifications) ? data.qualifications : [];
        const workExperience = Array.isArray(data.workExperience) ? data.workExperience : [];

        // emergencyContact: ensure it's an object
        const emergencyContact = data.emergencyContact && typeof data.emergencyContact === "object"
          ? data.emergencyContact
          : { name: "", phone: "", relation: "" };

        // ── Build staff object ──
        const staffData = {
          staffId: data.staffId,
          firstName: data.firstName,
          lastName: data.lastName || "",
          email: data.email,
          phone: data.phone || "",
          gender: data.gender,
          dateOfBirth: dateOfBirth,
          joiningDate: joiningDate || new Date(),
          designation: data.designation,
          department: data.department || "",
          qualifications,
          workExperience,
          address: data.address || "",
          emergencyContact,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
          companyId: user.companyId,
          createdBy: user.id || user._id,
        };

        // ── Handle password ──
        const plainPassword = data.password || "default123";
        const passwordHash = await bcrypt.hash(plainPassword, 10);
        staffData.passwordHash = passwordHash;

        // ── Create and save ──
        const staffMember = new Staff(staffData);
        await staffMember.save();
        results.push(staffMember);
      } catch (err) {
        errors.push(err.message);
      }
    }

    // ── Response ──
    const response = {
      success: true,
      importedCount: results.length,
      message: `Imported ${results.length} staff members`,
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