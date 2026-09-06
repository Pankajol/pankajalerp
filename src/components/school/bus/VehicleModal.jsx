"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { FaTimes, FaBus, FaRoute } from "react-icons/fa";
import { toast } from "react-toastify";

export default function VehicleModal({ isOpen, onClose, vehicle, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [formData, setFormData] = useState({
    busNumber: "",
    capacity: 40,
    driverName: "",
    driverContact: "",
    route: "",
    status: "active",
  });

  // Load routes when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchRoutes = async () => {
        try {
          const token = localStorage.getItem("token");
          const headers = { headers: { Authorization: `Bearer ${token}` } };
          const res = await api.get("/school/bus/routes", { params: { limit: 1000 }, ...headers });
          setRoutes(res.data.data || []);
        } catch (err) {
          console.error(err);
        }
      };
      fetchRoutes();
    }
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (vehicle) {
      setFormData({
        busNumber: vehicle.busNumber || "",
        capacity: vehicle.capacity || 40,
        driverName: vehicle.driverName || "",
        driverContact: vehicle.driverContact || "",
        route: vehicle.route?._id || vehicle.route || "",
        status: vehicle.status || "active",
      });
    } else {
      setFormData({
        busNumber: "",
        capacity: 40,
        driverName: "",
        driverContact: "",
        route: "",
        status: "active",
      });
    }
  }, [vehicle, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.busNumber.trim()) {
      toast.error("Bus number is required");
      return;
    }
    if (!formData.driverName.trim()) {
      toast.error("Driver name is required");
      return;
    }
    if (formData.capacity < 1) {
      toast.error("Capacity must be at least 1");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const url = vehicle ? `/school/bus/vehicles/${vehicle._id}` : "/school/bus/vehicles";
      const method = vehicle ? "put" : "post";
      await api[method](url, formData, headers);
      toast.success(vehicle ? "Vehicle updated" : "Vehicle created");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save vehicle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-3xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600">
              <FaTimes size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <FaBus size={20} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">
                {vehicle ? "Edit Vehicle" : "New Vehicle"}
              </h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Bus Number *</label>
                  <input
                    type="text"
                    name="busNumber"
                    value={formData.busNumber}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Driver Name *</label>
                  <input
                    type="text"
                    name="driverName"
                    value={formData.driverName}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Driver Contact</label>
                  <input
                    type="text"
                    name="driverContact"
                    value={formData.driverContact}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Capacity *</label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleChange}
                    min="1"
                    className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <FaRoute size={14} /> Route
                  </label>
                  <select
                    name="route"
                    value={formData.route}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
                  >
                    <option value="">Not assigned</option>
                    {routes.map((r) => (
                      <option key={r._id} value={r._id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={onClose} className="px-6 py-2.5 border border-gray-300 rounded-2xl text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition disabled:opacity-60 shadow-md"
                >
                  {loading ? "Saving..." : vehicle ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}