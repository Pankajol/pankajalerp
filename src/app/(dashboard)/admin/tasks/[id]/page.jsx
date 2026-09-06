"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";

export default function TaskDetails() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [newComment, setNewComment] = useState("");

const [attachments, setAttachments] = useState([]);
const [posting, setPosting] = useState(false);

  // fetch task, comments, logs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tRes, cRes, lRes] = await Promise.all([
          api.get(`/tasks/${id}`),
          api.get(`/tasks/${id}/comments`),
          api.get(`/project/activitylogs?task=${id}`),
        ]);
        setTask(tRes.data);
        setComments(cRes.data);
        setLogs(lRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [id]);

  // add comment
// Add Comment

const handleFileChange = (e) => {
  setAttachments(Array.from(e.target.files));
};
const handleAddComment = async (e) => {
  e.preventDefault();

  if (!newComment.trim() && attachments.length === 0) return;

  try {
    setPosting(true);

    const formData = new FormData();

    formData.append("text", newComment);

    attachments.forEach((file) => {
      formData.append("attachments", file);
    });

    const res = await api.post(
      `/tasks/${id}/comments`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    setComments((prev) => [...prev, res.data]);
    setNewComment("");
    setAttachments([]);
  } catch (err) {
    console.error(err);
  } finally {
    setPosting(false);
  }
};
  if (!task) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6 grid grid-cols-3 gap-6">
      {/* Task Info */}
      <div className="col-span-2 bg-white shadow rounded-lg p-4">
        <h1 className="text-2xl font-bold mb-2">{task.title}</h1>
        <p className="text-gray-600 mb-2">
          Project: {task.project?.name || "—"}
        </p>
      <p className="text-gray-600 mb-2">
  <span className="font-semibold">Assigned:</span>{" "}
  {task.assignees?.length
    ? task.assignees.map((u) => u.name).join(", ")
    : "Unassigned"}
</p>
        <p className="text-gray-600 mb-2">Status: {task.status}</p>
        <p className="text-gray-600 mb-2">Priority: {task.priority}</p>
     <p className="text-gray-600 mb-2">
  <span className="font-semibold">Due Date:</span>{" "}
  {task?.endDate
    ? new Date(task.endDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Not Set"}
</p>
      </div>

      {/* Comments */}
      {/* <div className="col-span-1 bg-white shadow rounded-lg p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-3">Comments</h2>

        <div className="flex-1 overflow-y-auto mb-3 space-y-2">
          {comments.map((c) => (
            <div key={c._id} className="border-b pb-2">
              <p className="text-sm">
                <span className="font-semibold">{c.user?.name}:</span> {c.text}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(c.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            className="border p-2 rounded flex-1"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            required
          />
          <button className="bg-blue-600 text-white px-3 py-1 rounded">
            Send
          </button>
        </form>
      </div> */}

      {/* Activity Logs */}
      <div className="col-span-3 bg-white shadow rounded-lg p-4">
     <div className="col-span-1 bg-white shadow rounded-lg p-4 flex flex-col">

  <h2 className="text-lg font-semibold mb-4">
    Comments
  </h2>

  <div className="flex-1 overflow-y-auto space-y-4 mb-4">

    {comments.length === 0 && (
      <p className="text-gray-400 text-sm">
        No comments yet.
      </p>
    )}

    {comments.map((c) => (

      <div
        key={c._id}
        className="border rounded-lg p-3"
      >

        <div className="flex justify-between">

          <strong>{c.user?.name || "Unknown User"}</strong>

          <span className="text-xs text-gray-400">
            {new Date(c.createdAt).toLocaleString()}
          </span>

        </div>

        <p className="mt-2 whitespace-pre-wrap">
          {c.text}
        </p>

        {c.attachments?.length > 0 && (

          <div className="mt-3 space-y-2">

            {c.attachments.map((file, index) => (

              <a
                key={index}
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-blue-600"
              >

                {file.mimeType?.startsWith("image") ? (

                  <img
                    src={file.url}
                    className="w-16 h-16 rounded object-cover"
                    alt={file.originalName}
                  />

                ) : (

                  <span>📄</span>

                )}

                {file.originalName}

              </a>

            ))}

          </div>

        )}

      </div>

    ))}

  </div>

  <form
    onSubmit={handleAddComment}
    className="space-y-3 border-t pt-4"
  >

    <textarea
      className="border rounded-lg p-2 w-full"
      rows={3}
      placeholder="Write a comment..."
      value={newComment}
      onChange={(e) => setNewComment(e.target.value)}
    />

    <input
      type="file"
      multiple
      onChange={handleFileChange}
    />

    {attachments.length > 0 && (

      <div className="space-y-1">

        {attachments.map((file, i) => (

          <div key={i} className="text-sm">
            📎 {file.name}
          </div>

        ))}

      </div>

    )}

    <button
      disabled={posting}
      className="bg-blue-600 text-white px-4 py-2 rounded"
    >
      {posting ? "Sending..." : "Send Comment"}
    </button>

  </form>

</div>
      </div>
    </div>
  );
}
