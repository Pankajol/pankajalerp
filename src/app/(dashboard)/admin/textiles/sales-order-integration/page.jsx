"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  FaSync,
  FaPlus,
  FaEye,
  FaEdit,
  FaTrash,
  FaPlay,
  FaShoppingCart,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaChartBar,
  FaSearch,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function SalesOrderIntegrationPage() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState(null);

  const fetchData = useCallback(
    async (showToast = false) => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (statusFilter) params.append("status", statusFilter);

        const [recordsRes, statsRes] = await Promise.all([
          api.get(`/textiles/sales-order-production?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get("/textiles/sales-order-production/stats", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setRecords(recordsRes.data.data || []);
        setStats(statsRes.data.data);
        if (showToast) toast.success("Refreshed");
      } catch {
        setError("Failed to load data");
        toast.error("Failed to load");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConvert = async (id) => {
    if (!confirm("Convert this sales order to production?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await api.post(
        `/textiles/sales-order-production/${id}/convert`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Production order created!");
      fetchData();
    } catch {
      toast.error("Conversion failed");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/textiles/sales-order-production/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted");
      fetchData();
    } catch {
      toast.error("Delete failed");
    }
  };

  const getStatusColor = (status) => {
    const map = {
      pending: "bg-gray-100 text-gray-600",
      "in-progress": "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      delayed: "bg-red-100 text-red-700",
      cancelled: "bg-gray-200 text-gray-400",
    };
    return map[status] || "bg-gray-100 text-gray-600";
  };

  const getPriorityLabel = (priority) => {
    if (priority === 3) return "🚨 Urgent";
    if (priority === 2) return "🔥 High";
    return "📌 Normal";
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
    </tr>
  );

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <FaShoppingCart size={24} className="text-blue-600" />
            Sales Order → Production Integration
          </h1>
          <p className="text-sm text-gray-500">Convert sales orders to production orders</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchData(true);
            }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            <FaSync className={refreshing ? "animate-spin" : ""} size={14} /> Refresh
          </button>
          <Link
            href="/admin/textiles/sales-order-integration/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md"
          >
            <FaPlus size={12} /> New Integration
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase">Total Orders</p>
            <p className="text-xl font-bold text-gray-800">{stats.total || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase">Pending</p>
            <p className="text-xl font-bold text-gray-600">{stats.pending || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase">In Progress</p>
            <p className="text-xl font-bold text-blue-600">{stats["in-progress"] || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase">Completed</p>
            <p className="text-xl font-bold text-green-600">{stats.completed || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase">Delayed</p>
            <p className="text-xl font-bold text-red-600">{stats.delayed || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase">Pending Qty</p>
            <p className="text-xl font-bold text-amber-600">{stats.pendingQuantity?.toFixed(0) || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchData(true);
          }}
          className="flex gap-2 flex-wrap"
        >
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order # or customer..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none w-60"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="delayed">Delayed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Search
          </button>
        </form>
        <span className="text-sm text-gray-500">{records.length} records</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex justify-between">
          <span>{error}</span>
          <button
            onClick={() => fetchData()}
            className="px-4 py-1 bg-red-600 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">
                  SO #
                </th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">
                  Customer
                </th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">
                  Qty
                </th>
                <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase text-gray-400">
                  Priority
                </th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">
                  PO #
                </th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                    No sales orders integrated yet
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r._id} className="hover:bg-blue-50/20 transition">
                    <td className="px-6 py-4 font-mono font-bold text-blue-600">
                      {r.salesOrder?.orderNumber}
                    </td>
                    <td className="px-6 py-4 text-gray-800">{r.salesOrder?.customer?.name || "N/A"}</td>
                    <td className="px-6 py-4 text-right font-bold">{r.plannedQuantity}</td>
                    <td className="px-6 py-4 text-center text-xs font-bold">
                      {getPriorityLabel(r.priority)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${getStatusColor(
                          r.status
                        )}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">
                      {r.productionOrder?.orderNumber || "—"}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/admin/textiles/sales-order-integration/${r._id}`}
                        className="p-2 text-gray-400 hover:text-blue-600"
                      >
                        <FaEye size={14} />
                      </Link>
                      {!r.productionOrder && (
                        <button
                          onClick={() => handleConvert(r._id)}
                          className="p-2 text-green-500 hover:text-green-700"
                          title="Convert to Production"
                        >
                          <FaPlay size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(r._id)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <FaTrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}