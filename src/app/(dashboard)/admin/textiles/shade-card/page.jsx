// app/admin/textiles/shade-card/page.jsx
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
  FaPalette,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function ShadeCardPage() {
  const [shades, setShades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  const fetchShades = useCallback(
    async (showToast = false) => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(
          `/textiles/shade-card?search=${encodeURIComponent(search)}`,
          headers
        );
        setShades(res.data.data || []);
        if (showToast) toast.success("✅ Shades refreshed");
      } catch {
        setError("Failed to load shade cards");
        toast.error("Failed to load shades");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search]
  );

  useEffect(() => {
    fetchShades();
  }, [fetchShades]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchShades(true);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchShades(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this shade?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/textiles/shade-card/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Shade deleted");
      fetchShades();
    } catch {
      toast.error("Delete failed");
    }
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
      <td className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-20 ml-auto" /></td>
    </tr>
  );

  return (
    <div className="p-6 font-sans bg-[#f2f5f9] min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <FaPalette className="text-pink-600" size={24} />
            Shade Card
          </h1>
          <p className="text-sm text-gray-500">Manage color shades for textiles</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
            <FaSync className={refreshing ? "animate-spin" : ""} size={14} /> Refresh
          </button>
          <Link href="/admin/textiles/shade-card/new" className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-bold hover:bg-pink-700 transition shadow-md">
            <FaPlus size={12} /> New Shade
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or code..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-400 outline-none w-60" />
          </div>
          <button type="submit" className="bg-pink-500 text-white px-6 py-2 rounded-lg hover:bg-pink-600 transition">Search</button>
        </form>
        <span className="text-sm text-gray-500">{shades.length} shades</span>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex justify-between items-center"><span>{error}</span><button onClick={() => fetchShades()} className="px-4 py-1 bg-red-600 text-white rounded-lg text-sm">Retry</button></div>}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">Code</th>
              <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">Name</th>
              <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">Description</th>
              <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase text-gray-400">Sample</th>
              <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />) : shades.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400"><div className="text-4xl mb-3">🎨</div><p>No shades found</p><Link href="/admin/textiles/shade-card/new" className="inline-block mt-4 px-5 py-2 bg-pink-600 text-white rounded-xl text-sm">Create Shade</Link></td></tr>
            ) : shades.map((s) => (
              <tr key={s._id} className="hover:bg-pink-50/20 transition">
                <td className="px-6 py-4 font-mono font-bold text-pink-600">{s.code}</td>
                <td className="px-6 py-4 font-medium text-gray-800">{s.name}</td>
                <td className="px-6 py-4 text-gray-600">{s.description || "—"}</td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-block w-8 h-8 rounded-full border border-gray-200" style={{ backgroundColor: s.hexCode || "#ccc" }} />
                </td>
                <td className="px-6 py-4 text-right space-x-1.5">
                  <Link href={`/admin/textiles/shade-card/${s._id}`} className="p-2 text-gray-400 hover:text-pink-600"><FaEye size={14} /></Link>
                  <Link href={`/admin/textiles/shade-card/${s._id}/edit`} className="p-2 text-gray-400 hover:text-pink-600"><FaEdit size={14} /></Link>
                  <button onClick={() => handleDelete(s._id)} className="p-2 text-gray-400 hover:text-red-500"><FaTrash size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}