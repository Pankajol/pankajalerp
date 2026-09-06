import { NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import Student from "@/models/school/Student";
import House from "@/models/school/House";
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

function isPortalStudentOrParent(user) {
  return user?.type === "school" && ["student", "parent"].includes(user.schoolRole || user.role);
}

// ─── GET (list) ──────────────────────────────────────────────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit")) || 20, 1), 100);
    const search = searchParams.get("search") || "";
    const classFilter = searchParams.get("class") || "";
    const section = searchParams.get("section") || "";
    const isActive = searchParams.get("isActive");
    const house = searchParams.get("house");

    const query = { companyId: user.companyId };
    if (isPortalStudentOrParent(user)) query._id = user.id;

    if (classFilter) query.class = classFilter;
    if (section) query.section = section;
    if (house && mongoose.Types.ObjectId.isValid(house)) query.house = house;
    if (isActive === "true") query.isActive = true;
    else if (isActive === "false") query.isActive = false;

    if (search) {
      query.$or = [
        { studentId: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { "parent.name": { $regex: search, $options: "i" } },
        { "parent.phone": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      Student.find(query)
        .populate("house", "name color")
        .populate("siblings", "firstName lastName studentId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Student.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: students,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /school/students error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ─── POST (create) ──────────────────────────────────────────────────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();

    // Validate required fields
    const required = ["studentId", "firstName", "dateOfBirth", "gender", "class"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Check duplicate studentId
    const existing = await Student.findOne({
      studentId: body.studentId,
      companyId: user.companyId,
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Student ID already exists" },
        { status: 409 }
      );
    }

    // If old `house` (ObjectId) is provided, validate it (backward compatibility)
    if (body.house) {
      const houseDoc = await House.findOne({
        _id: body.house,
        companyId: user.companyId,
      });
      if (!houseDoc) {
        return NextResponse.json(
          { success: false, message: "House not found" },
          { status: 400 }
        );
      }
    }

    // Validate siblings if provided
    if (body.siblings && body.siblings.length > 0) {
      const siblings = await Student.find({
        _id: { $in: body.siblings },
        companyId: user.companyId,
      }).lean();
      if (siblings.length !== body.siblings.length) {
        return NextResponse.json(
          { success: false, message: "One or more siblings not found" },
          { status: 400 }
        );
      }
    }

    // Extract passwords and houseInfo
    const { password, parentPassword, houseInfo, ...studentData } = body;

    const student = new Student({
      ...studentData,
      companyId: user.companyId,
      createdBy: user.id || user._id,
    });

    // Store houseInfo if provided
    if (houseInfo && typeof houseInfo === "object") {
      student.houseInfo = houseInfo;
    }

    // Hash passwords if provided
    if (password) student.passwordHash = await bcrypt.hash(password, 10);
    if (parentPassword) student.parentPasswordHash = await bcrypt.hash(parentPassword, 10);

    await student.save();
    await student.populate("house", "name color");

    const studentResponse = student.toObject();
    delete studentResponse.passwordHash;
    delete studentResponse.parentPasswordHash;

    return NextResponse.json({
      success: true,
      data: studentResponse,
      message: "Student created successfully",
    });
  } catch (err) {
    console.error("POST /school/students error:", err);
    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Student ID already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: err.message || "Creation failed" },
      { status: 500 }
    );
  }
}



// import { NextResponse } from "next/server";
// import mongoose from "mongoose";
// import bcrypt from "bcryptjs";
// import dbConnect from "@/lib/db";
// import Student from "@/models/school/Student";
// import House from "@/models/school/House";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// // ─── Auth helpers ────────────────────────────────────────────────────
// function isAuthorized(user) {
//   if (!user) return false;
//   if (user.type === "company") return true;
//   const allowedRoles = ["admin", "school admin", "principal", "teacher", "student", "parent"];
//   const userRoles = Array.isArray(user.roles) ? user.roles : [];
//   return userRoles.some((role) => allowedRoles.includes(role.trim().toLowerCase()));
// }

// async function validateUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };
//   try {
//     const user = await verifyJWT(token);
//     if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
//     return { user };
//   } catch {
//     return { error: "Invalid token", status: 401 };
//   }
// }

// function isPortalStudentOrParent(user) {
//   return user?.type === "school" && ["student", "parent"].includes(user.schoolRole || user.role);
// }

// function isPortalUser(user) {
//   return user?.type === "school";
// }

// // ─── GET (list) ──────────────────────────────────────────────────────
// export async function GET(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { searchParams } = new URL(req.url);
//     const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
//     const limit = Math.min(Math.max(parseInt(searchParams.get("limit")) || 20, 1), 100);
//     const search = searchParams.get("search") || "";
//     const classFilter = searchParams.get("class") || "";
//     const section = searchParams.get("section") || "";
//     const isActive = searchParams.get("isActive");
//     const house = searchParams.get("house");

//     const query = { companyId: user.companyId };
//     if (isPortalStudentOrParent(user)) query._id = user.id;

//     if (classFilter) query.class = classFilter;
//     if (section) query.section = section;
//     if (house && mongoose.Types.ObjectId.isValid(house)) query.house = house;
//     if (isActive === "true") query.isActive = true;
//     else if (isActive === "false") query.isActive = false;

//     if (search) {
//       // Search across multiple fields
//       query.$or = [
//         { studentId: { $regex: search, $options: "i" } },
//         { firstName: { $regex: search, $options: "i" } },
//         { lastName: { $regex: search, $options: "i" } },
//         { email: { $regex: search, $options: "i" } },
//         { phone: { $regex: search, $options: "i" } },
//         { "parent.name": { $regex: search, $options: "i" } },
//         { "parent.phone": { $regex: search, $options: "i" } },
//       ];
//     }

//     const skip = (page - 1) * limit;

//     const [students, total] = await Promise.all([
//       Student.find(query)
//         .populate("house", "name color")
//         .populate("siblings", "firstName lastName studentId")
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       Student.countDocuments(query),
//     ]);

//     return NextResponse.json({
//       success: true,
//       data: students,
//       meta: { page, limit, total, pages: Math.ceil(total / limit) },
//     });
//   } catch (err) {
//     console.error("GET /school/students error:", err);
//     return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
//   }
// }

// // ─── POST (create) ──────────────────────────────────────────────────
// export async function POST(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     if (isPortalUser(user)) {
//       return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
//     }

//     const body = await req.json();

//     // Validate required fields
//     const required = ["studentId", "firstName", "dateOfBirth", "gender", "class"];
//     for (const field of required) {
//       if (!body[field]) {
//         return NextResponse.json(
//           { success: false, message: `${field} is required` },
//           { status: 400 }
//         );
//       }
//     }

//     // Check duplicate studentId
//     const existing = await Student.findOne({
//       studentId: body.studentId,
//       companyId: user.companyId,
//     });
//     if (existing) {
//       return NextResponse.json(
//         { success: false, message: "Student ID already exists" },
//         { status: 409 }
//       );
//     }

//     // Validate house if provided
//     if (body.house) {
//       const houseDoc = await House.findOne({
//         _id: body.house,
//         companyId: user.companyId,
//       });
//       if (!houseDoc) {
//         return NextResponse.json(
//           { success: false, message: "House not found" },
//           { status: 400 }
//         );
//       }
//     }

//     // Validate siblings if provided
//     if (body.siblings && body.siblings.length > 0) {
//       const siblings = await Student.find({
//         _id: { $in: body.siblings },
//         companyId: user.companyId,
//       }).lean();
//       if (siblings.length !== body.siblings.length) {
//         return NextResponse.json(
//           { success: false, message: "One or more siblings not found" },
//           { status: 400 }
//         );
//       }
//     }

//     const { password, parentPassword, ...studentData } = body;
//     const student = new Student({
//       ...studentData,
//       companyId: user.companyId,
//       createdBy: user.id || user._id,
//     });
//     if (password) student.passwordHash = await bcrypt.hash(password, 10);
//     if (parentPassword) student.parentPasswordHash = await bcrypt.hash(parentPassword, 10);

//     await student.save();
//     const credentialUpdate = {};
//     if (password) credentialUpdate.passwordHash = student.passwordHash;
//     if (parentPassword) credentialUpdate.parentPasswordHash = student.parentPasswordHash;
//     if (Object.keys(credentialUpdate).length) {
//       await Student.updateOne({ _id: student._id }, { $set: credentialUpdate }, { strict: false });
//     }
//     await student.populate("house", "name color");
//     const studentResponse = student.toObject();
//     delete studentResponse.passwordHash;
//     delete studentResponse.parentPasswordHash;

//     return NextResponse.json({
//       success: true,
//       data: studentResponse,
//       message: "Student created successfully",
//     });
//   } catch (err) {
//     console.error("POST /school/students error:", err);
//     if (err.code === 11000) {
//       return NextResponse.json(
//         { success: false, message: "Student ID already exists" },
//         { status: 409 }
//       );
//     }
//     return NextResponse.json(
//       { success: false, message: err.message || "Creation failed" },
//       { status: 500 }
//     );
//   }
// }
