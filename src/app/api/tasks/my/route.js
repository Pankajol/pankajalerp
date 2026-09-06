import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Task from "@/models/TaskModel";
import SubTask from "@/models/project/SubTaskModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// GET /tasks/my
// Returns tasks where the current user is an assignee on the task itself,
// OR on at least one of its subtasks — regardless of role. Kept separate
// from GET /tasks (which only auto-scopes for the "Employee" role) so any
// user can pull their own worklist explicitly.
export async function GET(req) {
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const query = {
      company: decoded.companyId,
      $or: [
        { assignees: decoded.id },
        { "subtasks.assignees": decoded.id },
      ],
    };
    if (status) query.status = status;

 const tasks = await Task.find(query)
  .populate("assignees", "name email")
  .populate("creatBy", "name email")
  .populate("subTasks")
      .sort({ endDate: 1 });

    return NextResponse.json(tasks, { status: 200 });
  } catch (err) {
    console.error("Error fetching my tasks:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}