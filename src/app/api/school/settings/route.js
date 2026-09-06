import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SchoolSettings from "@/models/school/SchoolSettings";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers ────────────────────────────────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin",
    "project manager",
    "site engineer",
    "project coordinator",
    "site supervisor",
    "accounts manager",
    "purchase manager",
  ];
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

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const settings = await SchoolSettings.findOne({ companyId: user.companyId }).lean();
    if (!settings) {
      // Return default settings if not found
      return NextResponse.json({
        success: true,
        data: {
          schoolName: "",
          schoolAddress: "",
          schoolPhone: "",
          schoolEmail: "",
          academicYear: new Date().getFullYear().toString(),
          attendancePoints: { present: 2, halfDay: 1, leave: 0, absent: -1 },
        },
      });
    }
    return NextResponse.json({ success: true, data: settings });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    let settings = await SchoolSettings.findOne({ companyId: user.companyId });
    if (!settings) {
      settings = new SchoolSettings({ companyId: user.companyId });
    }

    const updatable = ["schoolName", "schoolAddress", "schoolPhone", "schoolEmail", "academicYear", "attendancePoints"];
    for (const field of updatable) {
      if (body[field] !== undefined) {
        settings[field] = body[field];
      }
    }
    settings.updatedBy = user.id || user._id;
    await settings.save();
    return NextResponse.json({ success: true, data: settings });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}