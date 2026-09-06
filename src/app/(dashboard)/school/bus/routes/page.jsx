"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  FaPlus,
  FaTrash,
  FaSearch,
  FaEdit,
  FaRoute,
  FaClock,
  FaStop,
} from "react-icons/fa";
import { toast } from "react-toastify";
import RouteModal from "@/components/school/bus/RouteModal";

export default function BusRoutesPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [meta, setMeta] = useState({ page: 1, total: 0, pages: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);

  const fetchRoutes = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const params = { page, limit: 10, search };
      const res = await api.get("/school/bus/routes", { params, ...headers });
      setRoutes(res.data.data || []);
      setMeta(res.data.meta || { page: 1, total: 0, pages: 1 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load routes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this route?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/school/bus/routes/${id}`, headers);
      toast.success("Route deleted");
      fetchRoutes(meta.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const handleEdit = (route) => {
    setEditingRoute(route);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingRoute(null);
    fetchRoutes(meta.page);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaRoute className="text-indigo-500" size={24} />
            Bus Routes
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {meta.total} {meta.total === 1 ? "route" : "routes"} total
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingRoute(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition shadow-md"
        >
          <FaPlus /> Add Route
        </motion.button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <FaSearch className="absolute left-4 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by route name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 pr-4 py-3 w-full border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
          />
        </div>
        <button
          onClick={() => fetchRoutes(1)}
          className="px-6 py-3 bg-indigo-100 text-indigo-700 rounded-2xl hover:bg-indigo-200 transition font-medium"
        >
          Apply Filters
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50 to-indigo-100/50">
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700">Description</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-indigo-700">Stops</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-indigo-700">Active</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-indigo-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                // skeletons...
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12 mx-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 ml-auto"></div></td>
                  </tr>
                ))
              ) : routes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                        <FaRoute size={32} className="text-indigo-300" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700">No routes found</h3>
                      <p className="text-gray-400 mt-1">
                        {search ? "Try adjusting your search" : "Add your first bus route"}
                      </p>
                      {!search && (
                        <button
                          onClick={() => { setEditingRoute(null); setModalOpen(true); }}
                          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition shadow-md"
                        >
                          Add Route
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                routes.map((route, idx) => (
                  <motion.tr
                    key={route._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4 font-medium text-gray-800">{route.name}</td>
                    <td className="px-6 py-4 text-gray-600">{route.description || "—"}</td>
                    <td className="px-6 py-4 text-center font-bold text-indigo-700">{route.stops?.length || 0}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${route.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {route.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(route)}
                        className="p-2 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                        title="Edit route"
                      >
                        <FaEdit size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(route._id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete route"
                      >
                        <FaTrash size={15} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {meta.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-sm text-gray-500">Page {meta.page} of {meta.pages}</span>
            <div className="flex gap-2">
              <button onClick={() => fetchRoutes(meta.page - 1)} disabled={meta.page <= 1} className="px-4 py-2 border border-gray-200 rounded-2xl text-sm hover:bg-white disabled:opacity-50 transition">Previous</button>
              <button onClick={() => fetchRoutes(meta.page + 1)} disabled={meta.page >= meta.pages} className="px-4 py-2 border border-gray-200 rounded-2xl text-sm hover:bg-white disabled:opacity-50 transition">Next</button>
            </div>
          </div>
        )}
      </div>

      <RouteModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        route={editingRoute}
        onSuccess={() => fetchRoutes(meta.page)}
      />
    </div>
  );
}