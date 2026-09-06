import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Homework from "@/models/school/Homework";
import Staff from "@/models/school/Staff";         // fixed typo
import Student from "@/models/school/Student";     // ← added for class lookup
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helper ──────────────────────────────────────────────
function isAuthorizedForHomework(user, method = "GET") {
  if (!user) return false;
  if (user.type === "company") return true;

  const roles = (user.roles || []).map(r => r.toLowerCase());
  const teacherRoles = [
    "admin", "school admin", "principal", "teacher",
    "project manager", "site engineer", "project coordinator",
    "site supervisor", "accounts manager", "purchase manager"
  ];
  if (roles.some(r => teacherRoles.includes(r))) return true;

  if (method === "GET") {
    if (user.type === "student" || roles.includes("student")) return true;
    if (user.type === "parent" || roles.includes("parent")) return true;
  }
  return false;
}

async function validateUser(req, method = "GET") {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorizedForHomework(user, method)) {
      return { error: "Unauthorized", status: 403 };
    }
    return { user };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

// ─── GET /api/school/homework/[id] ────────────────────────────
export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, "GET");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const homework = await Homework.findOne({ _id: id, companyId: user.companyId })
      .populate("teacher", "firstName lastName")
      .populate("submissions.student", "firstName lastName")
      .lean();

    if (!homework) {
      return NextResponse.json({ success: false, message: "Homework not found" }, { status: 404 });
    }

    // ─── Student class check (with database fallback) ────────
    const roles = (user.roles || []).map(r => r.toLowerCase());
    const isStudent = user.type === "student" || roles.includes("student");

    if (isStudent) {
      let studentClass = user.class;

      // If class is not in the token, fetch from DB
      if (!studentClass) {
        console.log("[Homework] student.class missing in token, fetching from DB...");
        const student = await Student.findById(user.id).select("class").lean();
        if (student) {
          studentClass = student.class;
        } else {
          // If student not found, deny access (or allow? better to deny)
          return NextResponse.json(
            { success: false, message: "Student record not found" },
            { status: 403 }
          );
        }
      }

      // If still no class, deny
      if (!studentClass) {
        return NextResponse.json(
          { success: false, message: "Student class not available" },
          { status: 403 }
        );
      }

      // Compare with homework's class
      if (homework.class !== studentClass) {
        console.log(`[Homework] Denied: student class ${studentClass} ≠ homework class ${homework.class}`);
        return NextResponse.json(
          { success: false, message: "Not authorized for this homework" },
          { status: 403 }
        );
      }
    }

    // ─── (Optional) Parent check: you can verify the selected student
    //     belongs to this parent. For now, we skip.

    return NextResponse.json({ success: true, data: homework });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const body = await req.json();
    const homework = await Homework.findOne({ _id: id, companyId: user.companyId });
    if (!homework) {
      return NextResponse.json({ success: false, message: "Homework not found" }, { status: 404 });
    }

    const updatable = ["title", "description", "class", "subject", "teacher", "dueDate", "attachments"];
    for (const field of updatable) {
      if (body[field] !== undefined) {
        homework[field] = body[field];
      }
    }
    if (body.teacher === "") homework.teacher = undefined;
    await homework.save();
    return NextResponse.json({ success: true, data: homework });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = await params;
    const homework = await Homework.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!homework) {
      return NextResponse.json({ success: false, message: "Homework not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Homework deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
