import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Task from "@/models/project/TaskModel";
import Notification from "@/models/project/NotificationModel";
import "@/models/project/ProjectModel";
import "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// =================== GET TASK ===================
export async function GET(req, { params }) {
  try {
    await connectDB();

    const { id } = await params; // ✅ Next.js 15

    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    if (!decoded) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const task = await Task.findOne({
      _id: id,
      company: decoded.companyId,
    }).populate("assignees", "name email")
      .populate("project", "name")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "name email",
        },
      });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (err) {
    console.error("GET /tasks/[id] error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// =================== UPDATE TASK ===================
export async function PUT(req, { params }) {
  try {
    await connectDB();

    const { id } = await params; // ✅ Next.js 15

    const token = getTokenFromHeader(req);

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded = verifyJWT(token);

    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const body = await req.json();

    let query = {
      _id: id,
      company: decoded.companyId,
    };

    // Employee can update only assigned task
    if (decoded.roles?.includes("Employee")) {
      query.assignees = decoded.id;
    }

    const updated = await Task.findOneAndUpdate(query, body, {
      new: true,
    }).populate("assignees", "name email");

    if (!updated) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      );
    }

    if (updated.assignees?.length) {
      const notifications = updated.assignees
        .filter((u) => u._id.toString() !== decoded.id)
        .map((u) => ({
          user: decoded.id,
          company: decoded.companyId,
          task: updated._id,
          type: "task-updated",
          message: `Task "${updated.title}" was updated`,
          assignedTo: u._id,
          read: false,
        }));

      if (notifications.length) {
        await Notification.insertMany(notifications);
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /tasks/[id] error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// =================== DELETE TASK ===================
export async function DELETE(req, { params }) {
  try {
    await connectDB();

    const { id } = await params; // ✅ Next.js 15

    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    if (!decoded) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const deleted = await Task.findOne({
      _id: id,
      company: decoded.companyId,
    }).populate("assignees", "_id");

    if (!deleted) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    await deleted.deleteOne();

    if (deleted.assignees?.length) {
      const notifications = deleted.assignees
        .filter((u) => u._id.toString() !== decoded.id)
        .map((u) => ({
          user: decoded.id,
          company: decoded.companyId,
          task: deleted._id,
          type: "task-deleted",
          message: `Task "${deleted.title}" was deleted`,
          assignedTo: u._id,
          read: false,
        }));

      if (notifications.length) {
        await Notification.insertMany(notifications);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (err) {
    console.error("DELETE /tasks/[id] error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}






// import { NextResponse } from "next/server";

// import connectDB from "@/lib/db";
// import Task from "@/models/project/TaskModel";
// import "@/models/project/ProjectModel";  // ✅ just import
// import "@/models/CompanyUser";           // ✅ just import
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function GET(req, { params }) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     const task = await Task.findOne({ _id: params.id, company: decoded.companyId });
//     if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

//     return NextResponse.json(task);
//   } catch (err) {
//     return NextResponse.json({ error: err.message }, { status: 401 });
//   }
// }


// export async function PUT(req, { params }) {
//   try {
//     await connectDB();

//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const decoded = verifyJWT(token);
//     if (!decoded) {
//       return NextResponse.json({ error: "Invalid token" }, { status: 401 });
//     }

//     const body = await req.json();

//     // Base query: company + task id
//     let query = { _id: params.id, company: decoded.companyId };

//     // Safe check for employee role
//     if (decoded?.roles?.includes("Employee")) {
//       query.assignees = decoded.id;
//     }

//     const updated = await Task.findOneAndUpdate(query, body, { new: true });

//     if (!updated) {
//       return NextResponse.json(
//         { error: "Not authorized or task not found" },
//         { status: 403 }
//       );
//     }

//     return NextResponse.json(updated, { status: 200 });
//   } catch (err) {
//     console.error("PUT /api/project/tasks/[id] error:", err);
//     return NextResponse.json({ error: err.message }, { status: 400 });
//   }
// }
// export async function DELETE(req, { params }) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     const deleted = await Task.findOneAndDelete({ _id: params.id, company: decoded.companyId });
//     if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

//     return NextResponse.json({ message: "Deleted successfully" });
//   } catch (err) {
//     return NextResponse.json({ error: err.message }, { status: 400 });
//   }
// }
