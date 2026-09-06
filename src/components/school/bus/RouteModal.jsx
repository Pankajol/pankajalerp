"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { FaTimes, FaPlus, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";

export default function RouteModal({ isOpen, onClose, route, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    stops: [],
    active: true,
  });

  useEffect(() => {
    if (route) {
      setFormData({
        name: route.name || "",
        description: route.description || "",
        stops: route.stops || [],
        active: route.active !== undefined ? route.active : true,
      });
    } else {
      setFormData({ name: "", description: "", stops: [], active: true });
    }
  }, [route, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleStopChange = (index, field, value) => {
    const updated = [...formData.stops];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, stops: updated }));
  };

  const addStop = () => {
    setFormData((prev) => ({
      ...prev,
      stops: [...prev.stops, { stopName: "", time: "", order: prev.stops.length }],
    }));
  };

  const removeStop = (index) => {
    setFormData((prev) => ({
      ...prev,
      stops: prev.stops.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Route name is required");
      return;
    }
    if (formData.stops.length === 0) {
      toast.error("Add at least one stop");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const url = route ? `/school/bus/routes/${route._id}` : "/school/bus/routes";
      const method = route ? "put" : "post";
      const res = await api[method](url, formData, headers);
      toast.success(route ? "Route updated" : "Route created");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save route");
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
            className="relative bg-white rounded-3xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600">
              <FaTimes size={20} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {route ? "Edit Route" : "New Route"}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Route Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="2"
                    className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-y"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">Stops</label>
                    <button
                      type="button"
                      onClick={addStop}
                      className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <FaPlus size={12} /> Add Stop
                    </button>
                  </div>
                  {formData.stops.map((stop, index) => (
                    <div key={index} className="flex gap-2 mb-2 items-center">
                      <input
                        type="text"
                        placeholder="Stop name"
                        value={stop.stopName}
                        onChange={(e) => handleStopChange(index, "stopName", e.target.value)}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Time (e.g. 07:30 AM)"
                        value={stop.time}
                        onChange={(e) => handleStopChange(index, "time", e.target.value)}
                        className="w-32 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeStop(index)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  ))}
                  {formData.stops.length === 0 && (
                    <p className="text-sm text-gray-400 italic">No stops added yet.</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleChange}
                    className="w-5 h-5 text-indigo-600 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">Active</label>
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
                  {loading ? "Saving..." : route ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}