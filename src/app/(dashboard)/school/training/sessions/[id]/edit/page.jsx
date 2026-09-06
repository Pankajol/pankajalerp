"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaSave,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaUserTie,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function EditSession() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState({
    program: "",
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    venue: "",
    facilitator: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const [programsRes, sessionRes] = await Promise.all([
          api.get("/school/training/programs", headers),
          api.get(`/school/training/sessions/${id}`, headers),
        ]);

        setPrograms(programsRes.data.data || []);

        const data = sessionRes.data.data;
        setForm({
          program: data.program?._id || "",
          title: data.title || "",
          date: data.date ? new Date(data.date).toISOString().split("T")[0] : "",
          startTime: data.startTime || "",
          endTime: data.endTime || "",
          venue: data.venue || "",
          facilitator: data.facilitator || "",
        });
      } catch {
        toast.error("Failed to load session");
        router.push("/school/training/sessions");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.program) newErrors.program = "Program is required";
    if (!form.title.trim()) newErrors.title = "Title is required";
    if (!form.date) newErrors.date = "Date is required";
    if (form.startTime && form.endTime && form.startTime >= form.endTime) {
      newErrors.endTime = "End time must be after start time";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await api.put(`/school/training/sessions/${id}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Session updated!");
      router.push(`/school/training/sessions/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-white p-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={() => router.back()}
            className="p-3 rounded-2xl bg-white shadow-sm hover:bg-gray-100 transition-all active:scale-95"
          >
            <FaArrowLeft size={22} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Edit Session
            </h1>
          </div>
        </motion.div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Program */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">
                Program <span className="text-red-500">*</span>
              </label>
              <select
                name="program"
                value={form.program}
                onChange={handleChange}
                className={`w-full border ${errors.program ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white`}
              >
                <option value="">Select program</option>
                {programs.map((p) => (
                  <option key={p._id} value={p._id}>{p.title}</option>
                ))}
              </select>
              {errors.program && <p className="text-xs text-red-500">{errors.program}</p>}
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">
                Session Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                className={`w-full border ${errors.title ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all`}
              />
              {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
            </div>

            {/* Date */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">
                Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <FaCalendarAlt size={18} />
                </div>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-4 py-3 border ${errors.date ? "border-red-500" : "border-gray-200"} rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all`}
                />
              </div>
              {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
            </div>

            {/* Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">Start Time</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <FaClock size={18} />
                  </div>
                  <input
                    type="time"
                    name="startTime"
                    value={form.startTime}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">End Time</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <FaClock size={18} />
                  </div>
                  <input
                    type="time"
                    name="endTime"
                    value={form.endTime}
                    onChange={handleChange}
                    className={`w-full pl-11 pr-4 py-3 border ${errors.endTime ? "border-red-500" : "border-gray-200"} rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all`}
                  />
                </div>
                {errors.endTime && <p className="text-xs text-red-500">{errors.endTime}</p>}
              </div>
            </div>

            {/* Venue */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">Venue</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <FaMapMarkerAlt size={18} />
                </div>
                <input
                  type="text"
                  name="venue"
                  value={form.venue}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>
            </div>

            {/* Facilitator */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">Facilitator</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <FaUserTie size={18} />
                </div>
                <input
                  type="text"
                  name="facilitator"
                  value={form.facilitator}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-8 py-3 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-3 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all disabled:opacity-70 active:scale-[0.97]"
              >
                <FaSave /> {saving ? "Saving..." : "Update Session"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}