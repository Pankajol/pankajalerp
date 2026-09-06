"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { FaPlus, FaTrash, FaSearch, FaVideo } from "react-icons/fa";
import { toast } from "react-toastify";

export default function LiveClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [meta, setMeta] = useState({ page: 1, total: 0, pages: 1 });

  const fetchClasses = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const params = { page, limit: 10, search };
      if (classFilter) params.class = classFilter;
      if (dateFilter) params.date = dateFilter;

      const res = await api.get("/school/live-classes", { params, ...headers });
      setClasses(res.data.data || []);
      setMeta(res.data.meta || { page: 1, total: 0, pages: 1 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load live classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [search, classFilter, dateFilter]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this live class?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/school/live-classes/${id}`, headers);
      toast.success("Live class deleted");
      fetchClasses(meta.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const classOptions = ["1","2","3","4","5","6","7","8","9","10","11","12"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Live Classes</h1>
        <button
          onClick={() => router.push("/school/live-classes/create")}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-md"
        >
          <FaPlus /> Schedule Class
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">All Classes</option>
          {classOptions.map((c) => (
            <option key={c} value={c}>Class {c}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="Filter by date"
        />
        <button
          onClick={() => fetchClasses(1)}
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
        ) : classes.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 py-12">No live classes scheduled</div>
        ) : (
          classes.map((lc) => (
            <div key={lc._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FaVideo className="text-indigo-600" />
                    <h3 className="font-bold text-gray-800">{lc.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{lc.class} · {lc.subject}</p>
                  <p className="text-sm text-gray-500">Teacher: {lc.teacher?.firstName} {lc.teacher?.lastName}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{new Date(lc.date).toLocaleDateString("en-GB")}</span>
                    <span>{lc.startTime} - {lc.endTime}</span>
                    <span className={`px-2 py-0.5 rounded-full ${
                      lc.platform === "zoom" ? "bg-blue-100 text-blue-700" :
                      lc.platform === "google-meet" ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {lc.platform.replace("-", " ")}
                    </span>
                  </div>
                  {lc.meetingLink && (
                    <a href={lc.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline mt-1 block">
                      Join Meeting →
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleDelete(lc._id)}
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
            <button onClick={() => fetchClasses(meta.page - 1)} disabled={meta.page <= 1} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
            <button onClick={() => fetchClasses(meta.page + 1)} disabled={meta.page >= meta.pages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
