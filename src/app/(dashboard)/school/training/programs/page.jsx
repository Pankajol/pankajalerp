"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaEye,
  FaTimes,
  FaGraduationCap,
  FaCalendarAlt,
  FaClock,
} from "react-icons/fa";
import { toast } from "react-toastify";

const CATEGORIES = ["pedagogy", "subject", "leadership", "technology", "other"];

export default function TrainingProgramsPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [meta, setMeta] = useState({ page: 1, total: 0, pages: 1 });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchPrograms = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const params = { page, limit: 15, search, category: categoryFilter };
      const res = await api.get("/school/training/programs", { params, ...headers });
      setPrograms(res.data.data || []);
      setMeta(res.data.meta || { page: 1, total: 0, pages: 1 });
    } catch (err) {
      toast.error("Failed to load programs");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchPrograms(1);
  }, [fetchPrograms]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/school/training/programs/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Program deleted");
      setShowDeleteModal(false);
      setDeleteId(null);
      fetchPrograms(meta.page);
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const openDeleteModal = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const getCategoryColor = (cat) => {
    const colors = {
      pedagogy: "bg-blue-100 text-blue-700",
      subject: "bg-green-100 text-green-700",
      leadership: "bg-purple-100 text-purple-700",
      technology: "bg-orange-100 text-orange-700",
      other: "bg-gray-100 text-gray-700",
    };
    return colors[cat] || colors.other;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
              <FaGraduationCap size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Training Programs</h1>
              <p className="text-gray-500 mt-1">Manage teacher training programs</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/school/training/programs/create")}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:shadow-xl hover:shadow-indigo-500/30 transition-all font-medium"
          >
            <FaPlus /> New Program
          </motion.button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[280px] relative">
              <FaSearch className="absolute left-4 top-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 pr-4 py-3 w-full border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-5 py-3 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
            <button
              onClick={() => { setSearch(""); setCategoryFilter(""); }}
              className="px-5 py-3 text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-2"
            >
              <FaTimes size={14} /> Clear
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Title
                  </th>
                  <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Category
                  </th>
                  <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Duration
                  </th>
                  <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Start Date
                  </th>
                  <th className="px-8 py-5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-8 py-5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                        <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                        <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                        <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                        <td className="px-8 py-6"></td>
                        <td className="px-8 py-6"></td>
                      </tr>
                    ))
                  ) : programs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-20 text-center">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <FaGraduationCap className="text-3xl text-gray-300" />
                        </div>
                        <p className="text-xl text-gray-400">No programs found</p>
                        <p className="text-gray-500 mt-1">Try adjusting your filters</p>
                      </td>
                    </tr>
                  ) : (
                    programs.map((p, index) => (
                      <motion.tr
                        key={p._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group hover:bg-indigo-50/50 transition-all duration-200"
                      >
                        <td className="px-8 py-5 font-medium text-gray-900">{p.title}</td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getCategoryColor(p.category)}`}>
                            {p.category}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <FaClock size={14} className="text-gray-400" />
                            {p.duration}h
                          </div>
                        </td>
                        <td className="px-8 py-5 text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <FaCalendarAlt size={14} className="text-gray-400" />
                            {p.startDate ? new Date(p.startDate).toLocaleDateString() : "—"}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                              p.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {p.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-70 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => router.push(`/school/training/programs/${p._id}`)}
                              className="p-2.5 hover:bg-white rounded-xl hover:text-indigo-600 transition-all"
                              title="View"
                            >
                              <FaEye size={18} />
                            </button>
                            <button
                              onClick={() => router.push(`/school/training/programs/${p._id}/edit`)}
                              className="p-2.5 hover:bg-white rounded-xl hover:text-blue-600 transition-all"
                              title="Edit"
                            >
                              <FaEdit size={18} />
                            </button>
                            <button
                              onClick={() => openDeleteModal(p._id)}
                              className="p-2.5 hover:bg-white rounded-xl hover:text-red-600 transition-all"
                              title="Delete"
                            >
                              <FaTrash size={18} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.pages > 1 && (
            <div className="px-8 py-5 border-t flex items-center justify-between bg-gray-50">
              <span className="text-sm text-gray-500">
                Showing {(meta.page - 1) * 15 + 1} to {Math.min(meta.page * 15, meta.total)} of {meta.total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchPrograms(meta.page - 1)}
                  disabled={meta.page <= 1}
                  className="px-5 py-2 border border-gray-200 rounded-2xl hover:bg-white disabled:opacity-40 transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchPrograms(meta.page + 1)}
                  disabled={meta.page >= meta.pages}
                  className="px-5 py-2 border border-gray-200 rounded-2xl hover:bg-white disabled:opacity-40 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete Program?</h3>
            <p className="text-gray-500 mb-6">
              This action cannot be undone. All associated sessions will also be deleted.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-6 py-2 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}