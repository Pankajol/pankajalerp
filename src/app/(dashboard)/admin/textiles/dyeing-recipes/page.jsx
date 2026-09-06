// src/app/(dashboard)/admin/textiles/dyeing-recipes/page.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { FaPlus, FaEdit, FaTrash, FaEye, FaFlask, FaSearch, FaSync } from "react-icons/fa";
import { toast } from "react-toastify";

export default function DyeingRecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  const fetchRecipes = useCallback(async (showToast = false) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get(`/textiles/dyeing-recipes?search=${encodeURIComponent(search)}`, headers);
      setRecipes(res.data.data || []);
      if (showToast) toast.success("✅ Recipes refreshed");
    } catch (err) {
      console.error(err);
      setError("Failed to load recipes. Please try again.");
      toast.error("Failed to load recipes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRecipes(true);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecipes(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this recipe? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/textiles/dyeing-recipes/${id}`, headers);
      toast.success("✅ Recipe deleted successfully");
      fetchRecipes();
    } catch (err) {
      toast.error("Delete failed. Please try again.");
    }
  };

  // Skeleton row
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
      <td className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-16 ml-auto" /></td>
      <td className="px-6 py-4 text-center"><div className="h-5 bg-gray-200 rounded-full w-16 mx-auto" /></td>
      <td className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-20 ml-auto" /></td>
    </tr>
  );

  return (
    <div className="p-6 font-sans bg-[#f2f5f9] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
            <FaFlask className="text-purple-600" size={24} />
            Dyeing Recipes
          </h1>
          <p className="text-sm text-gray-500">Manage shade cards & dyeing recipes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            <FaSync className={refreshing ? "animate-spin" : ""} size={14} />
            Refresh
          </button>
          <Link
            href="/admin/textiles/dyeing-recipes/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            <FaPlus size={12} /> New Recipe
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="flex w-full sm:w-auto gap-2">
          <div className="relative flex-1 sm:w-72">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by recipe code or product..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition"
            />
          </div>
          <button
            type="submit"
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg transition"
          >
            Search
          </button>
        </form>
        <div className="text-sm text-gray-500">
          {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} found
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex justify-between items-center">
          <span>⚠️ {error}</span>
          <button
            onClick={() => fetchRecipes()}
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
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Recipe Code</th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Product</th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Shade</th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Cost</th>
                <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : recipes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    <div className="text-4xl mb-3">🧪</div>
                    <p className="text-base font-medium text-gray-600">No recipes found</p>
                    <p className="text-sm text-gray-400 mt-1">Get started by creating your first dyeing recipe.</p>
                    <Link
                      href="/admin/textiles/dyeing-recipes/new"
                      className="inline-block mt-4 px-5 py-2 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition"
                    >
                      <FaPlus className="inline mr-2" size={12} /> Create Recipe
                    </Link>
                  </td>
                </tr>
              ) : (
                recipes.map((r) => (
                  <tr key={r._id} className="hover:bg-purple-50/20 transition-colors duration-150">
                    <td className="px-6 py-4 font-mono font-bold text-purple-600">{r.recipeCode}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{r.product?.itemName || "N/A"}</td>
                    <td className="px-6 py-4 text-gray-600">{r.shadeName}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-700">₹{r.totalCost || 0}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {r.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5">
                      <Link
                        href={`/admin/textiles/dyeing-recipes/${r._id}/view`}
                        className="p-2 text-gray-400 hover:text-purple-600 transition-colors inline-block"
                        title="View"
                      >
                        <FaEye size={14} />
                      </Link>
                      <Link
                        href={`/admin/textiles/dyeing-recipes/${r._id}/edit`}
                        className="p-2 text-gray-400 hover:text-purple-600 transition-colors inline-block"
                        title="Edit"
                      >
                        <FaEdit size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(r._id)}
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