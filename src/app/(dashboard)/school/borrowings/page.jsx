"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  FaBook,
  FaUser,
  FaCalendarAlt,
  FaClock,
  FaCheckCircle,
  FaUndo,
  FaSearch,
  FaEye,
  FaFileAlt,
  FaInfoCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function BorrowingsPage() {
  const router = useRouter();
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("");
  const [meta, setMeta] = useState({ page: 1, total: 0, pages: 1 });

  const fetchBorrowings = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const params = { page, limit: 10, status: statusFilter };
      if (studentFilter) params.student = studentFilter;

      const res = await api.get("/school/library/borrowings", { params, ...headers });
      setBorrowings(res.data.data || []);
      setMeta(res.data.meta || { page: 1, total: 0, pages: 1 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load borrowings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, studentFilter]);

  const handleReturn = async (borrowingId) => {
    if (!confirm("Confirm return of this book?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.post("/school/library/return", { borrowingId }, headers);
      toast.success("Book returned successfully");
      fetchBorrowings(meta.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Return failed");
    }
  };

  const statusColors = {
    borrowed: "bg-amber-100 text-amber-700",
    returned: "bg-emerald-100 text-emerald-700",
    overdue: "bg-red-100 text-red-700",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaBook className="text-indigo-500" size={24} />
            Borrowings
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {meta.total} {meta.total === 1 ? "record" : "records"} total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 mb-6 flex flex-wrap items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-5 py-3 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
        >
          <option value="all">All Status</option>
          <option value="borrowed">Borrowed</option>
          <option value="returned">Returned</option>
          <option value="overdue">Overdue</option>
        </select>

        <input
          type="text"
          placeholder="Student ID or Name"
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
          className="px-5 py-3 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white w-48"
        />

        <button
          onClick={() => fetchBorrowings(1)}
          className="px-6 py-3 bg-indigo-100 text-indigo-700 rounded-2xl hover:bg-indigo-200 transition font-medium"
        >
          Apply Filters
        </button>
        <a
  href={`/api/school/library/export?status=${statusFilter}`}
  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition shadow-md"
>
  <FaFileAlt /> Export CSV
</a>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50 to-indigo-100/50">
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Book</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Student</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Borrowed</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Due Date</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-indigo-700">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-indigo-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                // Loading skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-16 mx-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : borrowings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                        <FaBook size={32} className="text-indigo-300" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700">No borrowings found</h3>
                      <p className="text-gray-400 mt-1">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                borrowings.map((b, idx) => (
                  <motion.tr
                    key={b._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4 font-medium text-gray-800">
                      <span className="flex items-center gap-1">
                        <FaBook size={12} className="text-gray-400" />
                        {b.book?.title || "Deleted book"}
                      </span>
                      <span className="text-xs text-gray-400 block">{b.book?.bookId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1">
                        <FaUser size={12} className="text-gray-400" />
                        {b.student?.firstName} {b.student?.lastName}
                      </span>
                      <span className="text-xs text-gray-400 block">{b.student?.studentId}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(b.borrowedDate).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(b.dueDate).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusColors[b.status] || "bg-gray-100 text-gray-600"}`}>
                        {b.status === "borrowed" && <FaClock size={12} />}
                        {b.status === "returned" && <FaCheckCircle size={12} />}
                        {b.status === "overdue" && <FaClock size={12} />}
                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {b.status === "borrowed" && (
                        <button
                          onClick={() => handleReturn(b._id)}
                          className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition text-xs flex items-center gap-1 ml-auto"
                        >
                          <FaUndo size={12} /> Return
                        </button>
                      )}
                      {b.status === "returned" && (
                        <button
                          onClick={() => router.push(`/school/library/${b.book?._id}`)}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition text-xs flex items-center gap-1 ml-auto"
                        >
                          <FaEye size={12} /> View Book
                        </button>
                      )}
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
                onClick={() => fetchBorrowings(meta.page - 1)}
                disabled={meta.page <= 1}
                className="px-4 py-2 border border-gray-200 rounded-2xl text-sm hover:bg-white disabled:opacity-50 transition"
              >
                Previous
              </button>
              <button
                onClick={() => fetchBorrowings(meta.page + 1)}
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