"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaSync } from "react-icons/fa";
import { toast } from "react-toastify";

export default function LotAssignmentPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (showToast = false) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/textiles/lot-assignments?search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignments(res.data.data || []);
      if (showToast) toast.success("Refreshed");
    } catch {
      setError("Failed to load assignments");
      toast.error("Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this assignment?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/textiles/lot-assignments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted");
      fetchData();
    } catch {
      toast.error("Delete failed");
    }
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
    </tr>
  );

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <span className="text-3xl">📦</span> Lot Assignments
          </h1>
          <p className="text-sm text-gray-500">Assign lots to production orders</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setRefreshing(true); fetchData(true); }} disabled={refreshing} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
            <FaSync className={refreshing ? "animate-spin" : ""} size={14} /> Refresh
          </button>
          <Link href="/admin/textiles/lot-assignment/new" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md">
            <FaPlus size={12} /> New Assignment
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={(e) => { e.preventDefault(); fetchData(true); }} className="flex gap-2">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PO or Lot..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none w-60" />
          </div>
          <button type="submit" className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition">Search</button>
        </form>
        <span className="text-sm text-gray-500">{assignments.length} assignments</span>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex justify-between"><span>{error}</span><button onClick={() => fetchData()} className="px-4 py-1 bg-red-600 text-white rounded-lg text-sm">Retry</button></div>}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">PO #</th>
              <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">Lot</th>
              <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">Item</th>
              <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">Assigned</th>
              <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">Available</th>
              <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">Status</th>
              <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />) : assignments.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-400">No assignments found</td></tr>
            ) : assignments.map((a) => (
              <tr key={a._id} className="hover:bg-blue-50/20 transition">
                <td className="px-6 py-4 font-mono text-blue-600">{a.productionOrder?.orderNumber}</td>
                <td className="px-6 py-4 font-medium text-gray-800">{a.lot?.lotNumber}</td>
                <td className="px-6 py-4 text-gray-600">{a.item?.itemName}</td>
                <td className="px-6 py-4 text-right font-bold">{a.assignedQuantity} {a.lot?.unit}</td>
                <td className="px-6 py-4 text-right text-gray-600">{a.availableQuantity}</td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${a.status === 'assigned' ? 'bg-green-100 text-green-700' : a.status === 'used' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-1.5">
                  <Link href={`/admin/textiles/lot-assignment/${a._id}/edit`} className="p-2 text-gray-400 hover:text-blue-600"><FaEdit size={14} /></Link>
                  <button onClick={() => handleDelete(a._id)} className="p-2 text-gray-400 hover:text-red-500"><FaTrash size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}