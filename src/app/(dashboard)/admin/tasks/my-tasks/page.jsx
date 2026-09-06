"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProtectedPage from "@/components/ProtectedPage";
import {
  FaTasks, FaUserCircle, FaCalendarAlt, FaClock,
  FaChevronRight, FaFilter, FaCheckCircle
} from "react-icons/fa";

function MyTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchMyTasks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.get("/tasks/my", { headers });
      setTasks(res.data);
    } catch (err) {
      console.error("Error fetching my tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMyTasks(); }, []);

  const quickStatusUpdate = async (taskId, nextStatus) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        status: nextStatus,
        progress: nextStatus === "done" ? 100 : undefined,
      };
      await api.put(`/tasks/${taskId}/self-update`, payload, { headers });
      setTasks(prev => prev.map(t => t._id === taskId
        ? { ...t, status: nextStatus, progress: nextStatus === "done" ? 100 : t.progress }
        : t));
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const PriorityBadge = ({ level }) => {
    const map = {
      high: "bg-red-50 text-red-600 border-red-100",
      medium: "bg-amber-50 text-amber-600 border-amber-100",
      low: "bg-emerald-50 text-emerald-600 border-emerald-100"
    };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${map[level]}`}>{level}</span>;
  };

  const StatusBadge = ({ state }) => {
    const map = {
      todo: "bg-gray-100 text-gray-500",
      "in-progress": "bg-indigo-50 text-indigo-600",
      done: "bg-emerald-50 text-emerald-600"
    };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${map[state]}`}>{state.replace("-", " ")}</span>;
  };

  const filteredTasks = statusFilter === "all"
    ? tasks
    : tasks.filter(t => t.status === statusFilter);

  const counts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === "todo").length,
    "in-progress": tasks.filter(t => t.status === "in-progress").length,
    done: tasks.filter(t => t.status === "done").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-10">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
            <FaTasks className="text-indigo-600" /> My Tasks
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {user?.name ? `Tasks assigned to ${user.name}` : "Tasks assigned to you"}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          <FaFilter className="text-gray-300 mr-1 shrink-0" size={12} />
          {["all", "todo", "in-progress", "done"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full border transition-colors ${
                statusFilter === s
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-gray-200 text-gray-500 hover:border-indigo-300"
              }`}
            >
              {s === "all" ? "All" : s.replace("-", " ")} ({counts[s]})
            </button>
          ))}
        </div>

        {/* Task Cards */}
        {loading ? (
          <div className="text-center py-20 text-sm text-gray-400">Loading your tasks…</div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
            <FaCheckCircle className="text-gray-200 mx-auto mb-3" size={32} />
            <p className="text-sm text-gray-400 font-medium">Nothing here — you're all caught up.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map(t => {
              const mySubtasks = t.subtasks?.filter(s =>
                s.assignees?.some(a => (a._id || a) === user?._id)
              ) || [];

              return (
                <Link href={`/admin/tasks/my-tasks/${t._id}`} key={t._id} className="block">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all p-5 flex items-center gap-4">

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900 truncate">{t.title}</p>
                        <PriorityBadge level={t.priority} />
                        <StatusBadge state={t.status} />
                        {mySubtasks.length > 0 && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 rounded-md font-bold">
                            {mySubtasks.length} of your subtasks
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-400 font-medium">
                        <span className="flex items-center gap-1"><FaCalendarAlt className="text-gray-300" /> {t.startDate ? new Date(t.startDate).toLocaleDateString("en-IN") : "-"}</span>
                        <span className="flex items-center gap-1"><FaClock className="text-gray-300" /> {t.endDate ? new Date(t.endDate).toLocaleDateString("en-IN") : "-"}</span>
                        <span className="flex items-center gap-1"><FaUserCircle className="text-gray-300" /> {t.assignees?.map(u => u.name || u).join(", ")}</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-3 max-w-xs">
                        <div className="bg-indigo-500 h-full transition-all" style={{ width: `${t.progress}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0" onClick={e => e.preventDefault()}>
                      <select
                        value={t.status}
                        onChange={(e) => quickStatusUpdate(t._id, e.target.value)}
                        className="text-xs font-bold border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="todo">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                      <FaChevronRight className="text-gray-300" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProtectedMyTasksPage() {
  return (
    <ProtectedPage module="task" action="view">
      <MyTasksPage />
    </ProtectedPage>
  );
}