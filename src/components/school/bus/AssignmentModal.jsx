"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { FaTimes, FaUserGraduate, FaRoute, FaMapMarkerAlt, FaClock } from "react-icons/fa";
import { toast } from "react-toastify";

export default function AssignmentModal({ isOpen, onClose, assignment, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [formData, setFormData] = useState({
    student: "",
    route: "",
    stop: "",
    pickupTime: "",
    dropTime: "",
    active: true,
  });

  // Load students and routes when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const token = localStorage.getItem("token");
          const headers = { headers: { Authorization: `Bearer ${token}` } };
          const [studentsRes, routesRes] = await Promise.all([
            api.get("/school/students", { params: { limit: 1000, isActive: true }, ...headers }),
            api.get("/school/bus/routes", { params: { limit: 1000 }, ...headers }),
          ]);
          setStudents(studentsRes.data.data || []);
          setRoutes(routesRes.data.data || []);
        } catch (err) {
          console.error(err);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (assignment) {
      setFormData({
        student: assignment.student?._id || assignment.student || "",
        route: assignment.route?._id || assignment.route || "",
        stop: assignment.stop || "",
        pickupTime: assignment.pickupTime || "",
        dropTime: assignment.dropTime || "",
        active: assignment.active !== undefined ? assignment.active : true,
      });
      // Update stops based on selected route
      const route = routes.find((r) => r._id === (assignment.route?._id || assignment.route));
      if (route) setStops(route.stops || []);
    } else {
      setFormData({
        student: "",
        route: "",
        stop: "",
        pickupTime: "",
        dropTime: "",
        active: true,
      });
      setStops([]);
    }
  }, [assignment, routes, isOpen]);

  // When route changes, update stops
  const handleRouteChange = (e) => {
    const routeId = e.target.value;
    setFormData((prev) => ({ ...prev, route: routeId, stop: "" }));
    const route = routes.find((r) => r._id === routeId);
    setStops(route?.stops || []);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.student) {
      toast.error("Please select a student");
      return;
    }
    if (!formData.route) {
      toast.error("Please select a route");
      return;
    }
    if (!formData.stop) {
      toast.error("Please select a stop");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const url = assignment ? `/school/bus/assignments/${assignment._id}` : "/school/bus/assignments";
      const method = assignment ? "put" : "post";
      await api[method](url, formData, headers);
      toast.success(assignment ? "Assignment updated" : "Student assigned");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save assignment");
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
                <FaUserGraduate size={20} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">
                {assignment ? "Edit Assignment" : "Assign Student"}
              </h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Student *</label>
                  <select
                    name="student"
                    value={formData.student}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
                    required
                  >
                    <option value="">Select student</option>
                    {students.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.firstName} {s.lastName} - {s.studentId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <FaRoute size={14} /> Route *
                  </label>
                  <select
                    name="route"
                    value={formData.route}
                    onChange={handleRouteChange}
                    className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
                    required
                  >
                    <option value="">Select route</option>
                    {routes.map((r) => (
                      <option key={r._id} value={r._id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <FaMapMarkerAlt size={14} /> Stop *
                  </label>
                  <select
                    name="stop"
                    value={formData.stop}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
                    required
                    disabled={!formData.route}
                  >
                    <option value="">Select stop</option>
                    {stops.map((stop, idx) => (
                      <option key={idx} value={stop.stopName}>
                        {stop.stopName} {stop.time && `(${stop.time})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <FaClock size={14} /> Pickup Time
                    </label>
                    <input
                      type="time"
                      name="pickupTime"
                      value={formData.pickupTime}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <FaClock size={14} /> Drop Time
                    </label>
                    <input
                      type="time"
                      name="dropTime"
                      value={formData.dropTime}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleChange}
                    className="w-5 h-5 text-indigo-600 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">Active assignment</label>
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
                  {loading ? "Saving..." : assignment ? "Update" : "Assign"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}