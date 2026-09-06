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
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function QCInspectionPage() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [error, setError] = useState(null);

  const fetchData = useCallback(
    async (showToast = false) => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (resultFilter) params.append("result", resultFilter);
        const res = await api.get(
          `/textiles/qc-inspections?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setInspections(res.data.data || []);
        if (showToast) toast.success("Refreshed");
      } catch {
        setError("Failed to load inspections");
        toast.error("Failed to load");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, resultFilter]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this inspection?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/textiles/qc-inspections/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted");
      fetchData();
    } catch {
      toast.error("Delete failed");
    }
  };

  const getGradeColor = (grade) => {
    const map = {
      A: "bg-emerald-100 text-emerald-700",
      B: "bg-blue-100 text-blue-700",
      C: "bg-amber-100 text-amber-700",
      D: "bg-orange-100 text-orange-700",
      Reject: "bg-red-100 text-red-700",
    };
    return map[grade] || "bg-gray-100 text-gray-600";
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
    </tr>
  );

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <span className="text-3xl">🔬</span> QC Inspection
          </h1>
          <p className="text-sm text-gray-500">Quality control inspections for Takas</p>
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
            href="/admin/textiles/quality-inspection/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition shadow-md"
          >
            <FaPlus size={12} /> New Inspection
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
              placeholder="Search by Taka #..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none w-60"
            />
          </div>
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
          >
            <option value="">All Results</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>
          <button
            type="submit"
            className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition"
          >
            Search
          </button>
        </form>
        <span className="text-sm text-gray-500">{inspections.length} inspections</span>
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
                  Inspection #
                </th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">
                  Taka
                </th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">
                  Inspector
                </th>
                <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase text-gray-400">
                  Grade
                </th>
                <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase text-gray-400">
                  Result
                </th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : inspections.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    No inspections found
                  </td>
                </tr>
              ) : (
                inspections.map((i) => (
                  <tr key={i._id} className="hover:bg-purple-50/20 transition">
                    <td className="px-6 py-4 font-mono font-bold text-purple-600">
                      {i.inspectionNumber}
                    </td>
                    <td className="px-6 py-4 text-gray-800">{i.taka?.takaNumber}</td>
                    <td className="px-6 py-4 text-gray-600">{i.inspector?.name}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getGradeColor(
                          i.grade
                        )}`}
                      >
                        {i.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {i.finalResult === "pass" ? (
                        <FaCheck className="text-green-600 mx-auto" size={18} />
                      ) : (
                        <FaTimes className="text-red-600 mx-auto" size={18} />
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/admin/textiles/quality-inspection/${i._id}`}
                        className="p-2 text-gray-400 hover:text-purple-600"
                      >
                        <FaEye size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(i._id)}
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