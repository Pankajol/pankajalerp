import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Attendance from "@/models/school/Attendance";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import CompanyUser from "@/models/CompanyUser";
// ─── Auth helpers ────────────────────────────────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.type === "school") return true;
  const allowedRoles = [
    "admin", "school admin", "principal", "teacher",
  ];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some((role) => allowedRoles.includes(role.trim().toLowerCase()));
}

function schoolRole(user) {
  return (user?.schoolRole || user?.role || "").toLowerCase();
}

function isStudentOrParent(user) {
  return user?.type === "school" && ["student", "parent"].includes(schoolRole(user));
}

function isTeacherPortal(user) {
  return user?.type === "school" && schoolRole(user) === "teacher";
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
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const type = searchParams.get("type") || "student";

    const query = {
      companyId: user.companyId,
      date: new Date(date),
      type,
    };
    if (isStudentOrParent(user)) {
      query.type = "student";
      query.entityId = user.id;
    } else if (isTeacherPortal(user)) {
      query.type = "staff";
      query.entityId = user.id;
    }

    const stats = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      present: 0,
      absent: 0,
      halfDay: 0,
      leave: 0,
    };

    stats.forEach((s) => {
      result[s._id] = s.count;
    });

    const total = Object.values(result).reduce((a, b) => a + b, 0);
    return NextResponse.json({
      success: true,
      data: { ...result, total },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
