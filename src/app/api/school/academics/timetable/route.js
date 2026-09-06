import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Timetable from "@/models/school/Timetable";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = ["admin", "school admin", "principal", "teacher"];
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
    const { searchParams } = new URL(req.url);
    const classFilter = searchParams.get("class");
    const section = searchParams.get("section");
    const academicYear = searchParams.get("academicYear");

    const query = { companyId: user.companyId };
    if (classFilter) query.class = classFilter;
    if (section) query.section = section;
    if (academicYear) query.academicYear = academicYear;

    const timetable = await Timetable.findOne(query)
      .populate("schedule.periods.teacher", "firstName lastName")
      .lean();
    return NextResponse.json({ success: true, data: timetable });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    const { class: classStr, section, academicYear, schedule } = body;

    if (!classStr || !academicYear || !schedule || !schedule.length) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    // Check if timetable exists, update or create
    const existing = await Timetable.findOne({
      class: classStr,
      section: section || "",
      academicYear,
      companyId: user.companyId,
    });

    let timetable;
    if (existing) {
      existing.schedule = schedule;
      timetable = existing;
    } else {
      timetable = new Timetable({
        class: classStr,
        section: section || "",
        academicYear,
        schedule,
        companyId: user.companyId,
        createdBy: user.id || user._id,
      });
    }

    await timetable.save();
    return NextResponse.json({ success: true, data: timetable });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
