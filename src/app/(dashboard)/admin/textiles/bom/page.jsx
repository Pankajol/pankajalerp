// app/admin/textiles/bom/page.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaSearch,
  FaSync,
  FaFlask,
  FaPercentage,
  FaHashtag,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function TextileBOMPage() {
  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  // Fetch BOMs (with textile filters)
  const fetchBOMs = useCallback(
    async (showToast = false) => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(
          `/textiles/bom?search=${encodeURIComponent(search)}`,
          headers
        );
        setBoms(res.data.data || []);
        if (showToast) toast.success("✅ BOMs refreshed");
      } catch (err) {
        setError("Failed to load textile BOMs");
        toast.error("Failed to load BOMs");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search]
  );

  useEffect(() => {
    fetchBOMs();
  }, [fetchBOMs]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBOMs(true);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBOMs(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this BOM? This will affect production.")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/textiles/bom/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("✅ BOM deleted");
      fetchBOMs();
    } catch {
      toast.error("Delete failed");
    }
  };

  // Skeleton row
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
    </tr>
  );

  return (
    <div className="p-6 font-sans bg-[#f2f5f9] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <FaFlask className="text-indigo-600" size={24} />
            Textile BOM
          </h1>
          <p className="text-sm text-gray-500">
            Bill of Materials with shade, waste & batch tracking
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
          >
            <FaSync className={refreshing ? "animate-spin" : ""} size={14} />
            Refresh
          </button>
          <Link
            href="/admin/textiles/bom/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-md"
          >
            <FaPlus size={12} /> New BOM
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by BOM code or product..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none w-60"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition"
          >
            Search
          </button>
        </form>
        <span className="text-sm text-gray-500">{boms.length} BOMs</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex justify-between items-center">
          <span>⚠️ {error}</span>
          <button
            onClick={() => fetchBOMs()}
            className="px-4 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                  BOM Code
                </th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                  Product
                </th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                  Shade
                </th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                  Waste %
                </th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                  Batch/Lot
                </th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : boms.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="text-base font-medium text-gray-600">No BOMs found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Create your first textile BOM.
                    </p>
                    <Link
                      href="/admin/textiles/bom/new"
                      className="inline-block mt-4 px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition"
                    >
                      <FaPlus className="inline mr-2" size={12} /> Create BOM
                    </Link>
                  </td>
                </tr>
              ) : (
                boms.map((bom) => (
                  <tr
                    key={bom._id}
                    className="hover:bg-indigo-50/20 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                      {bom.bomCode}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {bom.product?.itemName || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {bom.shade?.name || "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-700">
                      {bom.wastePercent || 0}%
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {bom.batchNo || "—"}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5">
                      <Link
                        href={`/admin/textiles/bom/${bom._id}`}
                        className="p-2 text-gray-400 hover:text-indigo-600 transition-colors inline-block"
                        title="View"
                      >
                        <FaEye size={14} />
                      </Link>
                      <Link
                        href={`/admin/textiles/bom/${bom._id}/edit`}
                        className="p-2 text-gray-400 hover:text-indigo-600 transition-colors inline-block"
                        title="Edit"
                      >
                        <FaEdit size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(bom._id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors inline-block"
                        title="Delete"
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