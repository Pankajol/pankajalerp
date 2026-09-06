"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { FaPlus, FaTrash, FaSearch, FaBullhorn, FaClock } from "react-icons/fa";
import { toast } from "react-toastify";

export default function CircularsPage() {
  const router = useRouter();
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [targetGroupFilter, setTargetGroupFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [meta, setMeta] = useState({ page: 1, total: 0, pages: 1 });

  const fetchCirculars = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const params = { page, limit: 10, search };
      if (targetGroupFilter) params.targetGroup = targetGroupFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const res = await api.get("/school/circulars", { params, ...headers });
      setCirculars(res.data.data || []);
      setMeta(res.data.meta || { page: 1, total: 0, pages: 1 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load circulars");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCirculars();
  }, [search, targetGroupFilter, priorityFilter]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this circular?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/school/circulars/${id}`, headers);
      toast.success("Circular deleted");
      fetchCirculars(meta.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const targetGroups = [
    "all", "teachers", "students", "parents",
    "primary", "secondary",
    "all-teachers", "all-students", "all-parents"
  ];
  const priorities = ["low", "medium", "high"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Circulars</h1>
        <button
          onClick={() => router.push("/school/circulars/create")}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-md"
        >
          <FaPlus /> New Circular
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <select
          value={targetGroupFilter}
          onChange={(e) => setTargetGroupFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">All Groups</option>
          {targetGroups.map((g) => (
            <option key={g} value={g}>{g.replace("-", " ")}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">All Priorities</option>
          {priorities.map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <button
          onClick={() => fetchCirculars(1)}
          className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition"
        >
          Filter
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))
        ) : circulars.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 py-12">No circulars found</div>
        ) : (
          circulars.map((c) => (
            <div key={c._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FaBullhorn className="text-indigo-600" />
                    <h3 className="font-bold text-gray-800">{c.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{c.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>Groups: {c.targetGroups.join(", ")}</span>
                    <span className={`px-2 py-0.5 rounded-full ${
                      c.priority === "high" ? "bg-red-100 text-red-700" :
                      c.priority === "medium" ? "bg-amber-100 text-amber-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {c.priority}
                    </span>
                    {c.isActive ? (
                      <span className="text-emerald-600">● Active</span>
                    ) : (
                      <span className="text-gray-400">● Inactive</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <FaClock size={10} />
                    <span>{new Date(c.createdAt).toLocaleDateString("en-GB")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleDelete(c._id)}
                    className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {meta.pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <span className="text-sm text-gray-500">Page {meta.page} of {meta.pages}</span>
          <div className="flex gap-2">
            <button onClick={() => fetchCirculars(meta.page - 1)} disabled={meta.page <= 1} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
            <button onClick={() => fetchCirculars(meta.page + 1)} disabled={meta.page >= meta.pages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
