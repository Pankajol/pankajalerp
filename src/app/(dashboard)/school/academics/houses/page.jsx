"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  FaPlus,
  FaTrash,
  FaHome,
  FaUserTie,
  FaQuoteLeft,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function HousesPage() {
  const router = useRouter();
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHouses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get("/school/academics/houses", headers);
      setHouses(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load houses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHouses();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this house?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.delete(`/school/academics/houses/${id}`, headers);
      toast.success("House deleted");
      fetchHouses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div>
      {/* Page Header with Count */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaHome className="text-indigo-500" size={24} />
            All Houses
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {houses.length} {houses.length === 1 ? "house" : "houses"} registered
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/school/academics/houses/create")}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition shadow-md"
        >
          <FaPlus /> Add House
        </motion.button>
      </div>

      {/* Houses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-white rounded-3xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ))
        ) : houses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-full flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <FaHome size={40} className="text-indigo-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700">No houses yet</h3>
            <p className="text-gray-400 mt-1 max-w-sm">
              Create your first house to start organising students.
            </p>
            <button
              onClick={() => router.push("/school/academics/houses/create")}
              className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition shadow-md"
            >
              Create House
            </button>
          </motion.div>
        ) : (
          houses.map((house, idx) => (
            <motion.div
              key={house._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -6 }}
              className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-lg hover:border-indigo-200"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-sm"
                  style={{ backgroundColor: house.color || "#6366f1" }}
                >
                  {house.name?.[0]?.toUpperCase() || "H"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-gray-800 truncate">
                    {house.name}
                  </h3>
                  {house.motto && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 truncate">
                      <FaQuoteLeft size={10} className="text-gray-300" />
                      {house.motto}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                    <FaUserTie size={12} />
                    <span>Captain: {house.captain?.firstName} {house.captain?.lastName || "Not assigned"}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end mt-4 pt-3 border-t border-gray-50">
                <button
                  onClick={() => handleDelete(house._id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Delete house"
                >
                  <FaTrash size={16} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}