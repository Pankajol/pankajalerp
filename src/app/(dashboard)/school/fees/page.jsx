"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import {
  FaPlus,
  FaEye,
  FaEdit,
  FaTrash,
  FaSearch,
  FaMoneyBillWave,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaPrint,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function FeesPage() {
  const router = useRouter();
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [meta, setMeta] = useState({ page: 1, total: 0, pages: 1 });
  const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, overdue: 0 });

  const fetchFees = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const params = { page, limit: 12, search };
      if (statusFilter) params.status = statusFilter;

      const res = await api.get("/school/fees", { params, ...headers });
      setFees(res.data.data || []);
      setMeta(res.data.meta || { page: 1, total: 0, pages: 1 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load fees");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get("/school/fees/stats", { ...headers });
      setStats(res.data.data || { total: 0, paid: 0, pending: 0, overdue: 0 });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFees();
    fetchStats();
  }, [search, statusFilter]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this fee record?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/school/fees/${id}`, headers);
      toast.success("Fee record deleted");
      fetchFees(meta.page);
      fetchStats();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.post(`/school/fees/${id}/pay`, {}, headers);
      toast.success("Fee marked as paid");
      fetchFees(meta.page);
      fetchStats();
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num || 0);

  const statusColors = {
    paid: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    overdue: "bg-red-100 text-red-700",
    partial: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white">
              <FaMoneyBillWave size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Fee Management</h1>
              <p className="text-gray-500 mt-1">Track and manage student fees</p>
            </div>
          </div>

          <button
            onClick={() => router.push("/school/fees/collection")}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl hover:shadow-xl transition font-medium"
          >
            <FaPlus /> Collect Fee
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div whileHover={{ y: -4 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-500">Total Records</p>
            <p className="text-4xl font-bold text-gray-900 mt-2">{stats.total}</p>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-500 flex items-center gap-1"><FaCheckCircle className="text-emerald-500" /> Paid</p>
            <p className="text-4xl font-bold text-emerald-600 mt-2">{stats.paid}</p>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-500 flex items-center gap-1"><FaClock className="text-amber-500" /> Pending</p>
            <p className="text-4xl font-bold text-amber-600 mt-2">{stats.pending}</p>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-500 flex items-center gap-1"><FaExclamationTriangle className="text-red-500" /> Overdue</p>
            <p className="text-4xl font-bold text-red-600 mt-2">{stats.overdue}</p>
          </motion.div>
        </div>

        {/* Filters & Table */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b flex flex-wrap items-center gap-4 bg-gray-50">
            <div className="flex-1 min-w-[250px] relative">
              <FaSearch className="absolute left-4 top-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student name or receipt..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 pr-4 py-3 w-full border border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-5 py-3 border border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none bg-white"
            >
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="partial">Partial</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Receipt</th>
                  <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Student</th>
                  <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Fee Head</th>
                  <th className="px-6 py-5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                  <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Due Date</th>
                  <th className="px-6 py-5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-6"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                        <td className="px-6 py-6"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                        <td className="px-6 py-6"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                        <td className="px-6 py-6"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                        <td className="px-6 py-6"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                        <td className="px-6 py-6"><div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div></td>
                        <td className="px-6 py-6"><div className="h-4 bg-gray-200 rounded w-24 ml-auto"></div></td>
                      </tr>
                    ))
                  ) : fees.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-16 text-center text-gray-400">
                        No fee records found
                      </td>
                    </tr>
                  ) : (
                    fees.map((fee, idx) => (
                      <motion.tr
                        key={fee._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="hover:bg-emerald-50/50 transition-all"
                      >
                        <td className="px-6 py-5 font-medium text-emerald-600">{fee.receiptNumber}</td>
                        <td className="px-6 py-5">
                          {fee.student?.firstName} {fee.student?.lastName}
                          <span className="text-xs text-gray-400 block">{fee.student?.studentId}</span>
                        </td>
                        <td className="px-6 py-5 text-gray-700">{fee.feeHead}</td>
                        <td className="px-6 py-5 text-right font-bold text-gray-800">
                          {formatCurrency(fee.amount)}
                        </td>
                        <td className="px-6 py-5 text-gray-600">
                          {new Date(fee.dueDate).toLocaleDateString("en-GB")}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`inline-flex px-4 py-1 text-xs font-medium rounded-full ${statusColors[fee.status] || "bg-gray-100 text-gray-600"}`}>
                            {fee.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => window.open(`/api/school/fees/${fee._id}/receipt`, "_blank")}
                            className="p-2 hover:bg-white rounded-xl hover:text-gray-700 transition"
                            title="Print Receipt"
                          >
                            <FaPrint size={18} />
                          </button>
                          <button
                            onClick={() => router.push(`/school/fees/${fee._id}`)}
                            className="p-2 hover:bg-white rounded-xl hover:text-indigo-600 transition"
                            title="View"
                          >
                            <FaEye size={18} />
                          </button>
                          <button
                            onClick={() => router.push(`/school/fees/${fee._id}/edit`)}
                            className="p-2 hover:bg-white rounded-xl hover:text-blue-600 transition"
                            title="Edit"
                          >
                            <FaEdit size={18} />
                          </button>
                          {fee.status !== "paid" && (
                            <button
                              onClick={() => handleMarkPaid(fee._id)}
                              className="p-2 hover:bg-white rounded-xl hover:text-emerald-600 transition"
                              title="Mark as Paid"
                            >
                              <FaCheckCircle size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(fee._id)}
                            className="p-2 hover:bg-white rounded-xl hover:text-red-600 transition"
                            title="Delete"
                          >
                            <FaTrash size={18} />
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {meta.pages > 1 && (
            <div className="px-6 py-5 border-t flex items-center justify-between bg-gray-50">
              <span className="text-sm text-gray-500">
                Page {meta.page} of {meta.pages} ({meta.total} total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchFees(meta.page - 1)}
                  disabled={meta.page <= 1}
                  className="px-5 py-2 border border-gray-200 rounded-2xl hover:bg-white disabled:opacity-50 transition"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchFees(meta.page + 1)}
                  disabled={meta.page >= meta.pages}
                  className="px-5 py-2 border border-gray-200 rounded-2xl hover:bg-white disabled:opacity-50 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}