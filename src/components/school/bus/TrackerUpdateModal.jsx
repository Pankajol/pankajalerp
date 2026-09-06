"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { FaTimes, FaBus, FaMapMarkerAlt, FaClock, FaCrosshairs } from "react-icons/fa";
import { toast } from "react-toastify";

export default function TrackerUpdateModal({ isOpen, onClose, vehicle, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    latitude: "",
    longitude: "",
    speed: 0,
    status: "on route",
    currentStopIndex: -1,
    nextStop: "",
  });

  // Pre-fill with existing tracker data
  useEffect(() => {
    if (isOpen && vehicle) {
      const fetchTracker = async () => {
        try {
          const token = localStorage.getItem("token");
          const headers = { headers: { Authorization: `Bearer ${token}` } };
          const res = await api.get(`/school/bus/tracker?vehicle=${vehicle._id}`, headers);
          const data = res.data.data?.[0];
          if (data) {
            setFormData({
              latitude: data.latitude || "",
              longitude: data.longitude || "",
              speed: data.speed || 0,
              status: data.status || "on route",
              currentStopIndex: data.currentStopIndex || -1,
              nextStop: data.nextStop || "",
            });
          } else {
            setFormData({
              latitude: "",
              longitude: "",
              speed: 0,
              status: "on route",
              currentStopIndex: -1,
              nextStop: "",
            });
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchTracker();
    }
  }, [isOpen, vehicle]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ─── Auto‑location ──────────────────────────────────────────────
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        toast.success("Location captured");
      },
      (err) => {
        toast.error("Unable to get location: " + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.latitude === "" || formData.longitude === "") {
      toast.error("Latitude and longitude are required");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        vehicleId: vehicle._id,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        speed: parseFloat(formData.speed) || 0,
        status: formData.status,
        currentStopIndex: parseInt(formData.currentStopIndex) || -1,
        nextStop: formData.nextStop || "",
      };
      await api.post("/school/bus/tracker", payload, headers);
      toast.success("Bus location updated");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
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
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Update Bus Location</h2>
                <p className="text-sm text-gray-500">{vehicle?.busNumber} - {vehicle?.driverName}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Latitude & Longitude with "Get Location" button */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <FaMapMarkerAlt size={14} /> Coordinates *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.000001"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleChange}
                      placeholder="Latitude"
                      className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                      required
                    />
                    <input
                      type="number"
                      step="0.000001"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleChange}
                      placeholder="Longitude"
                      className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="mt-2 flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition"
                  >
                    <FaCrosshairs /> Get Current Location
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <FaClock size={14} /> Speed (km/h)
                  </label>
                  <input
                    type="number"
                    step="1"
                    name="speed"
                    value={formData.speed}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
                  >
                    <option value="on route">On Route</option>
                    <option value="at stop">At Stop</option>
                    <option value="delayed">Delayed</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Next Stop</label>
                  <input
                    type="text"
                    name="nextStop"
                    value={formData.nextStop}
                    onChange={handleChange}
                    placeholder="e.g. Main Gate"
                    className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  />
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
                  {loading ? "Updating..." : "Update Location"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
