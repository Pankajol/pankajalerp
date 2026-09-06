"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  FaPlus,
  FaTrash,
  FaSearch,
  FaEdit,
  FaEye,
  FaCalendarAlt,
  FaChalkboardTeacher,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function ExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [meta, setMeta] = useState({ page: 1, total: 0, pages: 1 });

  const fetchExams = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const params = { page, limit: 10, search };
      if (classFilter) params.class = classFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get("/school/exams", { params, ...headers });
      setExams(res.data.data || []);
      setMeta(res.data.meta || { page: 1, total: 0, pages: 1 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [search, classFilter, statusFilter]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this exam?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/school/exams/${id}`, headers);
      toast.success("Exam deleted");
      fetchExams(meta.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const classOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

  // Helper to get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case "published":
        return "bg-emerald-100 text-emerald-700";
      case "completed":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-amber-100 text-amber-700";
    }
  };

  return (
    <div>
      {/* Header with Count */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaCalendarAlt className="text-indigo-500" size={24} />
            Exams
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {meta.total} {meta.total === 1 ? "exam" : "exams"} total
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/school/exams/create")}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition shadow-md"
        >
          <FaPlus /> Create Exam
        </motion.button>
      </div>

      {/* Filters - Modern Pill Style */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <FaSearch className="absolute left-4 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 pr-4 py-3 w-full border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
          />
        </div>

        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-5 py-3 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
        >
          <option value="">All Classes</option>
          {classOptions.map((c) => (
            <option key={c} value={c}>Class {c}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-5 py-3 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="completed">Completed</option>
        </select>

        <button
          onClick={() => fetchExams(1)}
          className="px-6 py-3 bg-indigo-100 text-indigo-700 rounded-2xl hover:bg-indigo-200 transition font-medium"
        >
          Apply Filters
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50 to-indigo-100/50">
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Title</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Class</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Subject</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Date</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-indigo-700">Marks</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-indigo-700">Type</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-indigo-700">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-indigo-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                // Loading Skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12 mx-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-16 mx-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-16 mx-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 ml-auto"></div></td>
                  </tr>
                ))
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                        <FaCalendarAlt size={32} className="text-indigo-300" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700">No exams found</h3>
                      <p className="text-gray-400 mt-1">
                        {search || classFilter || statusFilter
                          ? "Try adjusting your filters"
                          : "Create your first exam"}
                      </p>
                      {!search && !classFilter && !statusFilter && (
                        <button
                          onClick={() => router.push("/school/exams/create")}
                          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition shadow-md"
                        >
                          Create Exam
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                exams.map((exam, idx) => (
                  <motion.tr
                    key={exam._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-gray-50 transition group"
                  >
                    <td className="px-6 py-4 font-medium text-gray-800">{exam.title}</td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-medium">
                        <FaChalkboardTeacher size={10} />
                        Class {exam.class}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{exam.subject}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(exam.date).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-indigo-700">
                      {exam.totalMarks}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        exam.type === "online"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {exam.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(exam.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          exam.status === "published" ? "bg-emerald-500" :
                          exam.status === "completed" ? "bg-purple-500" :
                          "bg-amber-500"
                        }`} />
                        {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                      <button
                        onClick={() => router.push(`/school/exams/${exam._id}`)}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        title="View exam"
                      >
                        <FaEye size={15} />
                      </button>
                      <button
                        onClick={() => router.push(`/school/exams/${exam._id}/edit`)}
                        className="p-2 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                        title="Edit exam"
                      >
                        <FaEdit size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(exam._id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete exam"
                      >
                        <FaTrash size={15} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-sm text-gray-500">
              Page {meta.page} of {meta.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchExams(meta.page - 1)}
                disabled={meta.page <= 1}
                className="px-4 py-2 border border-gray-200 rounded-2xl text-sm hover:bg-white disabled:opacity-50 transition"
              >
                Previous
              </button>
              <button
                onClick={() => fetchExams(meta.page + 1)}
                disabled={meta.page >= meta.pages}
                className="px-4 py-2 border border-gray-200 rounded-2xl text-sm hover:bg-white disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}