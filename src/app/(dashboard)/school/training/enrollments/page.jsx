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
  FaUserGraduate,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaAward,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function EnrollmentsPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [programs, setPrograms] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, pages: 1 });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchPrograms = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/school/training/programs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPrograms(res.data.data || []);
    } catch {}
  };

  const fetchEnrollments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const params = { page, limit: 15, search, program: programFilter, status: statusFilter };
      const res = await api.get("/school/training/enrollments", { params, ...headers });
      setEnrollments(res.data.data || []);
      setMeta(res.data.meta || { page: 1, total: 0, pages: 1 });
    } catch (err) {
      toast.error("Failed to load enrollments");
    } finally {
      setLoading(false);
    }
  }, [search, programFilter, statusFilter]);

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    fetchEnrollments(1);
  }, [fetchEnrollments]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/school/training/enrollments/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Enrollment deleted");
      setShowDeleteModal(false);
      setDeleteId(null);
      fetchEnrollments(meta.page);
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const openDeleteModal = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      enrolled: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      dropped: "bg-red-100 text-red-700",
    };
    return colors[status] || colors.enrolled;
  };

  const getStatusIcon = (status) => {
    const icons = {
      enrolled: <FaClock size={14} className="text-blue-500" />,
      completed: <FaCheckCircle size={14} className="text-green-500" />,
      dropped: <FaTimesCircle size={14} className="text-red-500" />,
    };
    return icons[status] || icons.enrolled;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
              <FaUserGraduate size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Enrollments</h1>
              <p className="text-gray-500 mt-1">Manage teacher enrollments in programs</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/school/training/enrollments/create")}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:shadow-xl hover:shadow-indigo-500/30 transition-all font-medium"
          >
            <FaPlus /> New Enrollment
          </motion.button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[280px] relative">
              <FaSearch className="absolute left-4 top-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by teacher name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 pr-4 py-3 w-full border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              />
            </div>
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="px-5 py-3 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
            >
              <option value="">All Programs</option>
              {programs.map((p) => (
                <option key={p._id} value={p._id}>{p.title}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-5 py-3 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
            >
              <option value="">All Status</option>
              <option value="enrolled">Enrolled</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
            </select>
            <button
              onClick={() => { setSearch(""); setProgramFilter(""); setStatusFilter(""); }}
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
                    Teacher
                  </th>
                  <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Program
                  </th>
                  <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-8 py-5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Certificate
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
                        <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                        <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                        <td className="px-8 py-6"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                        <td className="px-8 py-6"></td>
                      </tr>
                    ))
                  ) : enrollments.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-20 text-center">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <FaUserGraduate className="text-3xl text-gray-300" />
                        </div>
                        <p className="text-xl text-gray-400">No enrollments found</p>
                        <p className="text-gray-500 mt-1">Try adjusting your filters</p>
                      </td>
                    </tr>
                  ) : (
                    enrollments.map((e, index) => (
                      <motion.tr
                        key={e._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group hover:bg-indigo-50/50 transition-all duration-200"
                      >
                        <td className="px-8 py-5 font-medium text-gray-900">
                          {e.teacher?.firstName} {e.teacher?.lastName}
                          <div className="text-sm text-gray-400 font-normal">
                            {e.teacher?.staffId}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-gray-600">{e.program?.title || "—"}</td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(e.status)}`}>
                            {getStatusIcon(e.status)}
                            {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          {e.certificateIssued ? (
                            <span className="inline-flex items-center gap-1.5 text-green-600 font-medium text-sm">
                              <FaAward /> Issued
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-70 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => router.push(`/school/training/enrollments/${e._id}`)}
                              className="p-2.5 hover:bg-white rounded-xl hover:text-indigo-600 transition-all"
                              title="View"
                            >
                              <FaEye size={18} />
                            </button>
                            <button
                              onClick={() => router.push(`/school/training/enrollments/${e._id}/edit`)}
                              className="p-2.5 hover:bg-white rounded-xl hover:text-blue-600 transition-all"
                              title="Edit"
                            >
                              <FaEdit size={18} />
                            </button>
                            <button
                              onClick={() => openDeleteModal(e._id)}
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
                  onClick={() => fetchEnrollments(meta.page - 1)}
                  disabled={meta.page <= 1}
                  className="px-5 py-2 border border-gray-200 rounded-2xl hover:bg-white disabled:opacity-40 transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchEnrollments(meta.page + 1)}
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
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete Enrollment?</h3>
            <p className="text-gray-500 mb-6">
              This action cannot be undone. This will remove the teacher from the program.
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