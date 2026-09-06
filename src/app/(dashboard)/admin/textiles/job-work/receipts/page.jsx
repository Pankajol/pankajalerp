"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  FaPlus,
  FaTrash,
  FaSearch,
  FaSync,
  FaEye,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function JobWorkReceiptsPage() {
  const [receipts, setReceipts] = useState([]);
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
        const res = await api.get(
          `/textiles/job-work-receipts?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setReceipts(res.data.data || []);
        if (showToast) toast.success("Refreshed");
      } catch {
        setError("Failed to load receipts");
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
    if (!confirm("Delete this receipt?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/textiles/job-work-receipts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const getStatusColor = (status) => {
    const map = {
      draft: "bg-gray-100 text-gray-600",
      received: "bg-blue-100 text-blue-700",
      qc: "bg-green-100 text-green-700",
    };
    return map[status] || "bg-gray-100 text-gray-600";
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
    </tr>
  );

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <span className="text-3xl">📥</span> Job Work Receipts
          </h1>
          <p className="text-sm text-gray-500">Receive processed fabric from vendors</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchData(true);
            }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
          >
            <FaSync className={refreshing ? "animate-spin" : ""} size={14} /> Refresh
          </button>
          <Link
            href="/admin/textiles/job-work/receipts/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition shadow-md"
          >
            <FaPlus size={12} /> New Receipt
          </Link>
        </div>
      </div>

      {!loading && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Receipts", receipts.length, "text-slate-800"],
            ["Received qty", receipts.reduce((sum, item) => sum + Number(item.totalReceivedQty || 0), 0).toFixed(2), "text-emerald-600"],
            ["Shrinkage", receipts.reduce((sum, item) => sum + Number(item.commercialShrinkageMeter || 0), 0).toFixed(2), "text-amber-600"],
            ["QC completed", receipts.filter((item) => item.status === "qc").length, "text-blue-600"],
          ].map(([label, value, color]) => <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</p></div>)}
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchData(true);
          }}
          className="flex flex-wrap gap-2"
        >
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by receipt # or vendor..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none w-60"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-200 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="">All Status</option>
            <option value="received">Received</option>
            <option value="qc">QC Completed</option>
          </select>
          <button
            type="submit"
            className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition"
          >
            Search
          </button>
        </form>
        <span className="text-sm text-gray-500">{receipts.length} receipts</span>
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
                  Receipt #
                </th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">
                  Challan #
                </th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">
                  Vendor
                </th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">
                  Received Qty
                </th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">
                  Shrinkage %
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
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                    <p className="font-semibold text-slate-600">No receipts found</p>
                    <p className="mt-1 text-xs">Issue a challan before receiving fabric.</p>
                    <Link href="/admin/textiles/job-work/receipts/new" className="mt-4 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white">New Receipt</Link>
                  </td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r._id} className="hover:bg-emerald-50/20 transition">
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600">
                      {r.receiptNumber}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{r.challan?.challanNumber}</td>
                    <td className="px-6 py-4 text-gray-800">{r.vendor?.supplierName || "—"}</td>
                    <td className="px-6 py-4 text-right font-bold">
                      {r.totalReceivedQty}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={r.commercialShrinkagePercent > 5 ? "text-red-500 font-bold" : "text-gray-600"}>
                        {r.commercialShrinkagePercent?.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${getStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/admin/textiles/job-work/receipts/${r._id}`}
                        className="p-2 text-gray-400 hover:text-emerald-600"
                      >
                        <FaEye size={14} />
                      </Link>
                      {r.status !== "qc" && (
                        <>
                          <Link href={`/admin/textiles/job-work/receipts/${r._id}/edit`} className="p-2 text-gray-400 hover:text-emerald-600" title="Edit receipt">Edit</Link>
                          <button onClick={() => handleDelete(r._id)} className="p-2 text-gray-400 hover:text-red-500" title="Delete receipt"><FaTrash size={14} /></button>
                        </>
                      )}
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
