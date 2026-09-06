import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Comment from "@/models/project/CommentModel";
import Task from "@/models/project/TaskModel";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

import { Readable } from "stream";
import formidable from "formidable";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";

export const config = {
  api: {
    bodyParser: false,
  },
};

// ================= CLOUDINARY =================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ================= MULTIPART PARSER =================

async function parseMultipart(req) {
  const buffer = Buffer.from(await req.arrayBuffer());

  const nodeReq = new Readable();

  nodeReq.push(buffer);
  nodeReq.push(null);

  nodeReq.headers = Object.fromEntries(req.headers.entries());
  nodeReq.method = req.method;

  const form = formidable({
    multiples: true,
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(nodeReq, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

// ======================================================
// POST COMMENT
// ======================================================

export async function POST(req, { params }) {
  try {
    await connectDB();

    const { id } = await params;

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
        { error: "Invalid Token" },
        { status: 401 }
      );
    }

    const { fields, files } = await parseMultipart(req);

    const text = Array.isArray(fields.text)
      ? fields.text[0]
      : fields.text || "";

    // Find Task

    const task = await Task.findOne({
      _id: id,
      company: decoded.companyId,
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Find Logged User

    const companyUser = await CompanyUser.findById(decoded.id);

    if (!companyUser) {
      return NextResponse.json(
        {
          error: "Company user not found",
        },
        { status: 404 }
      );
    }

    // ================= UPLOAD FILES =================

    const attachments = [];

    let uploadFiles = [];

    if (files.attachments) {
      uploadFiles = Array.isArray(files.attachments)
        ? files.attachments
        : [files.attachments];
    }

    for (const file of uploadFiles) {
      if (!file || file.size === 0) continue;

      const result = await cloudinary.uploader.upload(file.filepath, {
        folder: "ERP/TaskComments",
        resource_type: "auto",
      });

      attachments.push({
        url: result.secure_url,
        public_id: result.public_id,
        originalName: file.originalFilename,
        mimeType: file.mimetype,
        size: file.size,
      });

      // delete temp file

      await fs.unlink(file.filepath).catch(() => {});
    }

    // Create Comment

    const comment = await Comment.create({
      text,
      task: task._id,
      user: companyUser._id,
      company: decoded.companyId,
      attachments,
    });

    // Push into Task

    task.comments.push(comment._id);

    await task.save();

    // Populate

    const populated = await Comment.findById(comment._id)
      .populate("user", "name email");

    return NextResponse.json(populated, {
      status: 201,
    });
  } catch (err) {
    console.error("POST COMMENT ERROR");

    console.error(err);

    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      }
    );
  }
}

// ======================================================
// GET COMMENTS
// ======================================================

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { id } = await params;

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
        { error: "Invalid Token" },
        { status: 401 }
      );
    }

    const task = await Task.findOne({
      _id: id,
      company: decoded.companyId,
    }).populate({
      path: "comments",
      populate: {
        path: "user",
        model: "CompanyUser",
        select: "name email",
      },
    });

    if (!task) {
      return NextResponse.json(
        {
          error: "Task not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(task.comments);
  } catch (err) {
    console.error("GET COMMENTS ERROR");

    console.error(err);

    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      }
    );
  }
}
// import { NextResponse } from "next/server";
// import connectDB from "@/lib/db";
// import Comment from "@/models/project/CommentModel";
// import Task from "@/models/project/TaskModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// // ================== GET comments for a task ==================
// export async function GET(req, { params }) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     const comments = await Comment.find({
//       task: params.id,
//       company: decoded.companyId,
//     }).populate("author", "name email");

//     return NextResponse.json(comments, { status: 200 });
//   } catch (err) {
//     console.error("Error fetching comments:", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }

// // ================== POST new comment ==================
// export async function POST(req, { params }) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     const { text } = await req.json();
//     if (!text) {
//       return NextResponse.json(
//         { error: "Text is required" },
//         { status: 400 }
//       );
//     }

//     // create comment
//     const newComment = await Comment.create({
//       task: params.id,
//       company: decoded.companyId,
//       author: decoded.userId,
//       text,
//     });

//     // push into Task
//     await Task.findByIdAndUpdate(params.id, {
//       $push: { comments: newComment._id },
//     });

//     const populated = await Comment.findById(newComment._id).populate(
//       "author",
//       "name email"
//     );

//     return NextResponse.json(populated, { status: 201 });
//   } catch (err) {
//     console.error("Error creating comment:", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }
