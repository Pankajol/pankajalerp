"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaSync,
  FaEye,
  FaRupeeSign,
  FaFileInvoice,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function CostingPage() {
  const [costings, setCostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  const fetchData = useCallback(
    async (showToast = false) => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        const res = await api.get(`/textiles/costing?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCostings(res.data.data || []);
        if (showToast) toast.success("Refreshed");
      } catch {
        setError("Failed to load costings");
        toast.error("Failed to load");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this costing?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/textiles/costing/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted");
      fetchData();
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleGenerate = async (takaId) => {
    if (!confirm("Generate costing from Taka data?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await api.post(
        `/textiles/costing/generate/${takaId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Costing generated!");
      fetchData();
    } catch {
      toast.error("Generation failed");
    }
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
    </tr>
  );

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <FaRupeeSign size={24} className="text-green-600" />
            Production Costing
          </h1>
          <p className="text-sm text-gray-500">Track production costs per Taka</p>
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
            href="/admin/textiles/costing/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition shadow-md"
          >
            <FaPlus size={12} /> New Costing
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchData(true);
          }}
          className="flex gap-2"
        >
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by # or Taka..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-400 outline-none w-60"
            />
          </div>
          <button
            type="submit"
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition"
          >
            Search
          </button>
        </form>
        <span className="text-sm text-gray-500">{costings.length} costings</span>
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">
                  Costing #
                </th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">
                  Taka
                </th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">
                  Total Cost
                </th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">
                  Cost/Mtr
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
              ) : costings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    No costings found
                  </td>
                </tr>
              ) : (
                costings.map((c) => (
                  <tr key={c._id} className="hover:bg-green-50/20 transition">
                    <td className="px-6 py-4 font-mono font-bold text-green-600">
                      {c.costingNumber}
                    </td>
                    <td className="px-6 py-4 text-gray-800">
                      {c.taka?.takaNumber || "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-bold">
                      ₹{c.totalCost?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      ₹{c.costPerMeter?.toFixed(2) || 0}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          c.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/admin/textiles/costing/${c._id}`}
                        className="p-2 text-gray-400 hover:text-green-600"
                      >
                        <FaEye size={14} />
                      </Link>
                      <Link
                        href={`/admin/textiles/costing/${c._id}/edit`}
                        className="p-2 text-gray-400 hover:text-green-600"
                      >
                        <FaEdit size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(c._id)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <FaTrash size={14} />
                      </button>
                      {c.taka && (
                        <button
                          onClick={() => handleGenerate(c.taka._id)}
                          className="p-2 text-blue-400 hover:text-blue-600"
                          title="Auto-generate from Taka"
                        >
                          <FaFileInvoice size={14} />
                        </button>
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