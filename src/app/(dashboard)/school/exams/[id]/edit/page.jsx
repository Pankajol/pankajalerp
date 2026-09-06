// app/school/exams/[id]/edit/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import Select from "react-select";
import {
  FaArrowLeft,
  FaSave,
  FaLaptop,
  FaClock,
  FaAward,
  FaBook,
  FaRandom,
  FaUserTie,
  FaInfoCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function EditExam() {
  const router = useRouter();
  const { id } = useParams(); // exam ID from URL
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    class: "",
    subject: "",
    teacher: "",
    date: "",
    duration: 60,
    totalMarks: 100,
    type: "offline", // will be set from fetched data
    status: "draft",
    instructions: "",
    randomizeQuestions: false,
    allowNavigation: true,
    showResults: false,
  });

  // Fetch staff list once
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get("/school/staff", { params: { limit: 1000 }, ...headers });
        setStaff(res.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStaff();
  }, []);

  // Fetch exam data
  useEffect(() => {
    const fetchExam = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/school/exams/${id}`, headers);
        const data = res.data.data;
        setFormData({
          title: data.title || "",
          class: data.class || "",
          subject: data.subject || "",
          teacher: data.teacher?._id || data.teacher || "",
          date: data.date ? new Date(data.date).toISOString().split("T")[0] : "",
          duration: data.duration || 60,
          totalMarks: data.totalMarks || 100,
          type: data.type || "offline",
          status: data.status || "draft",
          instructions: data.instructions || "",
          randomizeQuestions: data.randomizeQuestions || false,
          allowNavigation: data.allowNavigation !== undefined ? data.allowNavigation : true,
          showResults: data.showResults || false,
        });
      } catch (err) {
        console.error(err);
        toast.error("Failed to load exam details");
        router.push("/school/exams");
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [id, router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!formData.class) {
      toast.error("Please select a class");
      return;
    }
    if (!formData.subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!formData.date) {
      toast.error("Date is required");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.put(`/school/exams/${id}`, formData, headers);
      toast.success("✅ Exam updated successfully!");
      // Redirect back to the appropriate list
      if (formData.type === "online") {
        router.push("/school/exams/online");
      } else {
        router.push("/school/exams");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const staffOptions = staff.map((s) => ({
    value: s._id,
    label: `${s.firstName} ${s.lastName}`,
  }));

  const classOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((c) => ({
    value: c,
    label: `Class ${c}`,
  }));

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading exam details...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition"
      >
        <FaArrowLeft size={20} />
        <span>Back</span>
      </motion.button>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 max-w-3xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
            <FaBook size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Edit Exam</h2>
            <p className="text-sm text-gray-500">Update exam details</p>
          </div>
        </div>

        <form>
          <div className="space-y-6">
            {/* Title & Class */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Mid-Term Examination"
                  className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Class <span className="text-red-500">*</span>
                </label>
                <Select
                  options={classOptions}
                  value={classOptions.find((o) => o.value === formData.class)}
                  onChange={(opt) =>
                    setFormData((prev) => ({ ...prev, class: opt?.value || "" }))
                  }
                  placeholder="Select class"
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderRadius: "16px",
                      borderColor: "#e5e7eb",
                      padding: "2px",
                      boxShadow: "none",
                      "&:hover": { borderColor: "#6366f1" },
                      "&:focus-within": {
                        borderColor: "#6366f1",
                        boxShadow: "0 0 0 2px #c7d2fe",
                      },
                    }),
                  }}
                />
              </div>
            </div>

            {/* Subject & Teacher */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="e.g. Mathematics"
                  className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Teacher
                </label>
                <Select
                  options={staffOptions}
                  value={staffOptions.find((o) => o.value === formData.teacher)}
                  onChange={(opt) =>
                    setFormData((prev) => ({ ...prev, teacher: opt?.value || "" }))
                  }
                  placeholder="Assign teacher"
                  isClearable
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderRadius: "16px",
                      borderColor: "#e5e7eb",
                      padding: "2px",
                      boxShadow: "none",
                      "&:hover": { borderColor: "#6366f1" },
                      "&:focus-within": {
                        borderColor: "#6366f1",
                        boxShadow: "0 0 0 2px #c7d2fe",
                      },
                    }),
                  }}
                />
              </div>
            </div>

            {/* Date, Duration, Marks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <FaClock size={14} /> Duration (min)
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  min="1"
                  className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <FaAward size={14} /> Total Marks
                </label>
                <input
                  type="number"
                  name="totalMarks"
                  value={formData.totalMarks}
                  onChange={handleChange}
                  min="1"
                  className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white transition"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Online-specific fields – only show if type is online */}
            {formData.type === "online" && (
              <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100">
                <h3 className="font-semibold text-indigo-800 flex items-center gap-2 mb-4">
                  <FaLaptop size={18} /> Online Exam Settings
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <FaInfoCircle size={14} /> Instructions
                    </label>
                    <textarea
                      name="instructions"
                      value={formData.instructions}
                      onChange={handleChange}
                      rows="3"
                      placeholder="Instructions for students..."
                      className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-y"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition">
                      <input
                        type="checkbox"
                        name="randomizeQuestions"
                        checked={formData.randomizeQuestions}
                        onChange={handleChange}
                        className="w-5 h-5 text-indigo-600 rounded"
                      />
                      <div>
                        <div className="font-medium text-gray-700 flex items-center gap-1">
                          <FaRandom size={14} /> Randomise Questions
                        </div>
                        <div className="text-xs text-gray-400">Shuffle question order</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition">
                      <input
                        type="checkbox"
                        name="allowNavigation"
                        checked={formData.allowNavigation}
                        onChange={handleChange}
                        className="w-5 h-5 text-indigo-600 rounded"
                      />
                      <div>
                        <div className="font-medium text-gray-700">Allow Navigation</div>
                        <div className="text-xs text-gray-400">Students can go back/forward</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition">
                      <input
                        type="checkbox"
                        name="showResults"
                        checked={formData.showResults}
                        onChange={handleChange}
                        className="w-5 h-5 text-indigo-600 rounded"
                      />
                      <div>
                        <div className="font-medium text-gray-700">Show Results</div>
                        <div className="text-xs text-gray-400">Immediately after submission</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 border border-gray-300 rounded-2xl text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="button" // Prevent Enter key from submitting
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl hover:shadow-lg hover:from-indigo-700 hover:to-indigo-800 transition disabled:opacity-60 shadow-md"
            >
              <FaSave /> {saving ? "Saving..." : "Update Exam"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}