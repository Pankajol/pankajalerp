"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaSave,
  FaUserCheck,
  FaUserTimes,
  FaUserClock,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function EditAttendance() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({
    session: "",
    teacher: "",
    status: "present",
    remarks: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const [sessRes, teachRes, recordRes] = await Promise.all([
          api.get("/school/training/sessions", headers),
          api.get("/school/staff", { params: { limit: 1000 }, ...headers }),
          api.get(`/school/training/attendance/${id}`, headers),
        ]);

        setSessions(sessRes.data.data || []);
        setTeachers(teachRes.data.data || []);

        const data = recordRes.data.data;
        setForm({
          session: data.session?._id || "",
          teacher: data.teacher?._id || "",
          status: data.status || "present",
          remarks: data.remarks || "",
        });
      } catch {
        toast.error("Failed to load attendance record");
        router.push("/school/training/attendance");
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
    if (!form.session) newErrors.session = "Session is required";
    if (!form.teacher) newErrors.teacher = "Teacher is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await api.put(`/school/training/attendance/${id}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Attendance updated!");
      router.push(`/school/training/attendance/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      present: <FaUserCheck className="text-green-500" />,
      absent: <FaUserTimes className="text-red-500" />,
      late: <FaUserClock className="text-yellow-500" />,
    };
    return icons[status] || icons.present;
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
              Edit Attendance
            </h1>
          </div>
        </motion.div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Session */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">
                Session <span className="text-red-500">*</span>
              </label>
              <select
                name="session"
                value={form.session}
                onChange={handleChange}
                className={`w-full border ${errors.session ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white`}
              >
                <option value="">Select session</option>
                {sessions.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.title} - {new Date(s.date).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {errors.session && <p className="text-xs text-red-500">{errors.session}</p>}
            </div>

            {/* Teacher */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">
                Teacher <span className="text-red-500">*</span>
              </label>
              <select
                name="teacher"
                value={form.teacher}
                onChange={handleChange}
                className={`w-full border ${errors.teacher ? "border-red-500" : "border-gray-200"} rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white`}
              >
                <option value="">Select teacher</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.firstName} {t.lastName} ({t.staffId})
                  </option>
                ))}
              </select>
              {errors.teacher && <p className="text-xs text-red-500">{errors.teacher}</p>}
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">
                Status <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-4">
                {["present", "absent", "late"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, status }))}
                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                      form.status === status
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                    }`}
                  >
                    {getStatusIcon(status)}
                    <span className="capitalize">{status}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">
                Remarks (optional)
              </label>
              <input
                type="text"
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                placeholder="e.g., Late due to traffic"
              />
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
                <FaSave /> {saving ? "Saving..." : "Update Attendance"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}