import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Task from "@/models/TaskModel";
import SubTask from "@/models/project/SubTaskModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// PUT /tasks/:id/self-update
// Unlike PUT /tasks/:id (which only restricts the query for the "Employee"
// role, and accepts the full request body for anyone else), this endpoint:
//   1. Only ever writes status + progress — nothing else in the body is
//      trusted, so an assignee can never rewrite title/dates/assignees.
//   2. Requires the caller to be an assignee regardless of role, so an
//      Admin hitting this endpoint is still scoped to their own tasks.
const ALLOWED_STATUSES = ["todo", "in-progress", "done"];

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const update = {};

    if (body.status !== undefined) {
      if (!ALLOWED_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      update.status = body.status;
      if (body.status === "done") update.completedAt = new Date();
    }

    if (body.progress !== undefined) {
      const progress = Number(body.progress);
      if (Number.isNaN(progress) || progress < 0 || progress > 100) {
        return NextResponse.json({ error: "Invalid progress" }, { status: 400 });
      }
      update.progress = progress;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await Task.findOneAndUpdate(
      {
        _id: params.id,
        company: decoded.companyId,
        assignees: decoded.id, // must be an assignee, regardless of role
      },
      update,
      { new: true }
    ).populate("assignees", "name email");

    if (!updated) {
      return NextResponse.json({ error: "Not authorized or not found" }, { status: 403 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("Error in self-update:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}