"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProtectedPage from "@/components/ProtectedPage";
import {
  FaArrowLeft, FaCalendarAlt, FaClock, FaUserCircle, FaPlus,
  FaEdit, FaPaperPlane, FaLevelDownAlt, FaCheckCircle
} from "react-icons/fa";

function MyTaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Self-update form (status/progress only — employees can't rewrite task scope)
  const [status, setStatus] = useState("todo");
  const [progress, setProgress] = useState(0);

  // Subtask modal
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editSubtask, setEditSubtask] = useState(null);
  const [subTitle, setSubTitle] = useState("");
  const [subDescription, setSubDescription] = useState("");
  const [subPriority, setSubPriority] = useState("medium");
  const [subStatus, setSubStatus] = useState("todo");
  const [subProgress, setSubProgress] = useState(0);

  // Comments
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

const [attachments, setAttachments] = useState([]);

  const token = localStorage.getItem("token");
  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  console.log("User", user);

  const fetchTask = async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        api.get(`/tasks/${id}`, { headers: authHeaders() }),
        api.get(`/tasks/${id}/comments`, { headers: authHeaders() }),
      ]);
      setTask(tRes.data);
      setStatus(tRes.data.status);
      setProgress(tRes.data.progress || 0);
      setComments(cRes.data || []);
    } catch (err) {
      console.error("Error fetching task:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) fetchTask(); }, [id]);

  const isMySubtask = (s) => s.assignees?.some(a => (a._id || a) === user?._id);

  const saveSelfUpdate = async () => {
    setSaving(true);
    try {
      await api.put(`/tasks/${id}/self-update`, { status, progress }, { headers: authHeaders() });
      setTask(prev => ({ ...prev, status, progress }));
    } catch (err) {
      console.error("Error saving update:", err);
    } finally {
      setSaving(false);
    }
  };

  const openSubtaskModal = (sub = null) => {
    if (sub) {
      setEditSubtask(sub);
      setSubTitle(sub.title);
      setSubDescription(sub.description || "");
      setSubPriority(sub.priority);
      setSubStatus(sub.status);
      setSubProgress(sub.progress || 0);
    } else {
      setEditSubtask(null);
      setSubTitle(""); setSubDescription(""); setSubPriority("medium");
      setSubStatus("todo"); setSubProgress(0);
    }
    setSubModalOpen(true);
  };

  const handleFileChange = (e) => {
  setAttachments((prev) => [...prev, ...Array.from(e.target.files)]);
};

const removeAttachment = (index) => {
  setAttachments((prev) => prev.filter((_, i) => i !== index));
};

  const handleSubtaskSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      title: subTitle,
      description: subDescription,
      priority: subPriority,
      status: subStatus,
      progress: subProgress,
      assignees: editSubtask ? undefined : [user?._id],
    };
    try {
      if (editSubtask) {
        await api.put(`/tasks/${id}/subtasks/${editSubtask._id}`, payload, { headers: authHeaders() });
      } else {
        await api.post(`/tasks/${id}/subtasks`, payload, { headers: authHeaders() });
      }
      await fetchTask();
      setSubModalOpen(false);
    } catch (err) {
      console.error("Error saving subtask:", err);
    }
  };

const postComment = async () => {
  const formData = new FormData();

  formData.append("text", commentText);

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
  setCommentText("");
  setAttachments([]);
};

  const PriorityBadge = ({ level }) => {
    const map = {
      high: "bg-red-50 text-red-600 border-red-100",
      medium: "bg-amber-50 text-amber-600 border-amber-100",
      low: "bg-emerald-50 text-emerald-600 border-emerald-100"
    };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${map[level]}`}>{level}</span>;
  };

  const fi = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";
  const Lbl = ({ text }) => <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{text}</label>;

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-400">Loading task…</div>;
  }
  if (!task) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-400">Task not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-10">
      <div className="max-w-3xl mx-auto">

        {/* Back */}
        <button onClick={() => router.push("/admin/tasks/my-tasks")} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-indigo-600 mb-6">
          <FaArrowLeft size={11} /> Back to My Tasks
        </button>

        {/* Task Header Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <PriorityBadge level={task.priority} />
              </div>
              <h1 className="text-xl font-black text-gray-900">{task.title}</h1>
              {task.description && <p className="text-sm text-gray-500 mt-2">{task.description}</p>}
            </div>
          </div>

          <div className="flex items-center gap-6 mt-5 text-xs text-gray-400 font-medium">
            <span className="flex items-center gap-1.5"><FaCalendarAlt className="text-gray-300" /> {task.startDate ? new Date(task.startDate).toLocaleDateString("en-IN") : "-"}</span>
            <span className="flex items-center gap-1.5"><FaClock className="text-gray-300" /> {task.endDate ? new Date(task.endDate).toLocaleDateString("en-IN") : "-"}</span>
            <span className="flex items-center gap-1.5"><FaUserCircle className="text-gray-300" /> {task.assignees?.map(u => u.name || u).join(", ")}</span>
          </div>

          {/* Self-update controls */}
          <div className="mt-6 pt-6 border-t border-gray-100 grid sm:grid-cols-2 gap-5">
            <div>
              <Lbl text="Status" />
              <select className={fi} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <Lbl text={`Progress (${progress}%)`} />
              <input type="range" className="w-full accent-indigo-600 mt-2.5" value={progress} onChange={(e) => setProgress(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={saveSelfUpdate}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold text-xs hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              <FaCheckCircle size={11} /> {saving ? "Saving…" : "Save Update"}
            </button>
          </div>
        </div>

        {/* Subtasks */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">Subtasks</h2>
            <button onClick={() => openSubtaskModal()} className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700">
              <FaPlus size={10} /> Add Subtask
            </button>
          </div>

          {(!task.subtasks || task.subtasks.length === 0) ? (
            <p className="text-xs text-gray-400 py-4 text-center">No subtasks yet.</p>
          ) : (
            <div className="space-y-2">
              {task.subtasks.map(s => (
                <div key={s._id} className="flex items-center gap-3 bg-gray-50/60 border border-gray-100 rounded-xl px-4 py-3">
                  <FaLevelDownAlt className="text-gray-300 rotate-90 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-700 truncate">{s.title}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                      {s.status} • {s.priority} {isMySubtask(s) && <span className="text-indigo-500">• assigned to you</span>}
                    </p>
                    <div className="w-full bg-gray-200 h-1 rounded-full mt-1.5 max-w-[160px]">
                      <div className="bg-indigo-400 h-full" style={{ width: `${s.progress}%` }} />
                    </div>
                  </div>
                  {isMySubtask(s) && (
                    <button onClick={() => openSubtaskModal(s)} className="text-indigo-400 hover:text-indigo-600 p-1 shrink-0">
                      <FaEdit />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

   {/* Comments */}
<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
  <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide mb-5">
    Comments
  </h2>

  {/* Existing Comments */}
  <div className="space-y-5 mb-6 max-h-[380px] overflow-y-auto pr-2">

    {comments.length === 0 ? (
      <p className="text-center text-gray-400 text-sm">
        No comments yet.
      </p>
    ) : (
      comments.map((c) => (
        <div
          key={c._id}
          className="flex gap-3 border-b border-gray-100 pb-4"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <FaUserCircle className="text-indigo-500 text-2xl" />
          </div>

          <div className="flex-1">

            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">
                {c.user?.name || "Unknown User"}
              </h4>

              <span className="text-xs text-gray-400">
                {new Date(c.createdAt).toLocaleString("en-IN")}
              </span>
            </div>

            <p className="mt-1 text-gray-700 whitespace-pre-wrap">
              {c.text}
            </p>

            {/* Attachments */}

            {c.attachments?.length > 0 && (

              <div className="mt-3 grid gap-2">

                {c.attachments.map((file, i) => (

                  <a
                    key={i}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 border rounded-lg p-2 hover:bg-gray-50"
                  >

                    {file.mimeType?.startsWith("image") ? (
                      <img
                        src={file.url}
                        className="w-14 h-14 rounded object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded bg-gray-100 flex items-center justify-center">
                        📄
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium">
                        {file.originalName}
                      </p>

                      <p className="text-xs text-gray-400">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>

                    </div>

                  </a>

                ))}

              </div>

            )}

          </div>

        </div>
      ))
    )}

  </div>

  {/* Selected Files */}

  {attachments.length > 0 && (

    <div className="mb-4 flex flex-wrap gap-2">

      {attachments.map((file, index) => (

        <div
          key={index}
          className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2"
        >

          <span className="text-sm">{file.name}</span>

          <button
            onClick={() => removeAttachment(index)}
            className="text-red-500 font-bold"
          >
            ×
          </button>

        </div>

      ))}

    </div>

  )}

  {/* Input */}

  <div className="border-t pt-4 flex flex-col gap-3">

    <textarea
      rows={3}
      value={commentText}
      onChange={(e) => setCommentText(e.target.value)}
      placeholder="Write a comment..."
      className="border rounded-xl p-3 resize-none focus:ring-2 focus:ring-indigo-300"
    />

    <div className="flex justify-between items-center">

      <label className="cursor-pointer text-indigo-600 font-medium">

        📎 Attach Files

        <input
          hidden
          multiple
          type="file"
          onChange={handleFileChange}
        />

      </label>

      <button
        onClick={postComment}
        disabled={
          postingComment ||
          (!commentText.trim() && attachments.length === 0)
        }
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl"
      >

        <FaPaperPlane />

        {postingComment ? "Sending..." : "Send"}

      </button>

    </div>

  </div>

</div>
      </div>

      {/* Subtask Modal */}
      {subModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-emerald-50/50">
              <h2 className="text-xl font-black text-gray-900">{editSubtask ? "Update Subtask" : "Add Subtask"}</h2>
              <button onClick={() => setSubModalOpen(false)} className="text-gray-400 hover:text-red-500">×</button>
            </div>
            <form onSubmit={handleSubtaskSubmit} className="p-8 space-y-5">
              <div><Lbl text="Subtask Title" /><input type="text" className={fi} value={subTitle} onChange={(e) => setSubTitle(e.target.value)} required /></div>
              <div><Lbl text="Description" /><textarea className={`${fi} h-20 resize-none`} value={subDescription} onChange={(e) => setSubDescription(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Lbl text="Priority" /><select className={fi} value={subPriority} onChange={(e) => setSubPriority(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                <div><Lbl text="Status" /><select className={fi} value={subStatus} onChange={(e) => setSubStatus(e.target.value)}><option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="done">Done</option></select></div>
              </div>
              <div>
                <Lbl text={`Progress (${subProgress}%)`} />
                <input type="range" className="w-full accent-emerald-600" value={subProgress} onChange={(e) => setSubProgress(Number(e.target.value))} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setSubModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-bold text-sm">Cancel</button>
                <button type="submit" className="px-8 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100">Save Subtask</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProtectedMyTaskDetailPage() {
  return (
    <ProtectedPage module="task" action="view">
      <MyTaskDetailPage />
    </ProtectedPage>
  );
}