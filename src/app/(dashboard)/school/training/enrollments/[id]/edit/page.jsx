"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { FaArrowLeft, FaSave, FaUserGraduate, FaAward } from "react-icons/fa";
import { toast } from "react-toastify";

export default function EditEnrollment() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({
    program: "",
    teacher: "",
    status: "enrolled",
    certificateIssued: false,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const [progRes, teachRes, enrollRes] = await Promise.all([
          api.get("/school/training/programs", headers),
          api.get("/school/staff", { params: { limit: 1000 }, ...headers }),
          api.get(`/school/training/enrollments/${id}`, headers),
        ]);

        setPrograms(progRes.data.data || []);
        setTeachers(teachRes.data.data || []);

        const data = enrollRes.data.data;
        setForm({
          program: data.program?._id || "",
          teacher: data.teacher?._id || "",
          status: data.status || "enrolled",
          certificateIssued: data.certificateIssued || false,
        });
      } catch {
        toast.error("Failed to load enrollment");
        router.push("/school/training/enrollments");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.program) newErrors.program = "Program is required";
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
      await api.put(`/school/training/enrollments/${id}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Enrollment updated!");
      router.push(`/school/training/enrollments/${id}`);
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
              Edit Enrollment
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
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white"
              >
                <option value="enrolled">Enrolled</option>
                <option value="completed">Completed</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>

            {/* Certificate Issued */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                name="certificateIssued"
                checked={form.certificateIssued}
                onChange={handleChange}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FaAward className="text-indigo-500" /> Certificate Issued
              </label>
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
                <FaSave /> {saving ? "Saving..." : "Update Enrollment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}