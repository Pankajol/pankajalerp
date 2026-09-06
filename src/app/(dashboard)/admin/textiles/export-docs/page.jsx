"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  FaPlus,
  FaEye,
  FaEdit,
  FaTrash,
  FaSync,
  FaSearch,
  FaFileInvoice,
  FaTruck,
  FaShip,
  FaBoxes,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function ExportDocsPage() {
  const [docs, setDocs] = useState([]);
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
        const res = await api.get(`/textiles/export-docs?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDocs(res.data.data || []);
        if (showToast) toast.success("Refreshed");
      } catch {
        setError("Failed to load documents");
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

  const handleDelete = async (id) => {
    if (!confirm("Delete this document?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/textiles/export-docs/${id}`, {
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
      draft: "bg-gray-100 text-gray-600",
      approved: "bg-blue-100 text-blue-700",
      shipped: "bg-yellow-100 text-yellow-700",
      delivered: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return map[status] || "bg-gray-100 text-gray-600";
  };

  const getShippingIcon = (method) => {
    if (method === "air") return <FaShip className="text-blue-500" />;
    if (method === "sea") return <FaShip className="text-blue-600" />;
    if (method === "road") return <FaTruck className="text-amber-500" />;
    return <FaTruck className="text-gray-400" />;
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
            <FaFileInvoice size={24} className="text-indigo-600" />
            Export Documentation
          </h1>
          <p className="text-sm text-gray-500">Manage shipping & export documents</p>
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
            href="/admin/textiles/export-docs/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-md"
          >
            <FaPlus size={12} /> New Export Document
          </Link>
        </div>
      </div>

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
              placeholder="Search by export # or invoice..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none w-60"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            type="submit"
            className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition"
          >
            Search
          </button>
        </form>
        <span className="text-sm text-gray-500">{docs.length} documents</span>
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
                  Export #
                </th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">
                  Shipping Method
                </th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">
                  Invoice Value
                </th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : docs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    No export documents found
                  </td>
                </tr>
              ) : (
                docs.map((d) => (
                  <tr key={d._id} className="hover:bg-indigo-50/20 transition">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                      {d.exportNumber}
                    </td>
                    <td className="px-6 py-4 text-gray-800">{d.customer?.name || "N/A"}</td>
                    <td className="px-6 py-4 flex items-center gap-2">
                      {getShippingIcon(d.shippingMethod)}
                      <span className="text-gray-600">{d.shippingMethod || "—"}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold">
                      {d.currency} {d.invoiceValue?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${getStatusColor(
                          d.status
                        )}`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/admin/textiles/export-docs/${d._id}`}
                        className="p-2 text-gray-400 hover:text-indigo-600"
                      >
                        <FaEye size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(d._id)}
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