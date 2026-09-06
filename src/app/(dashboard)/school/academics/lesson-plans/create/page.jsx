"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import Select from "react-select";
import {
  FaArrowLeft,
  FaSave,
  FaBook,
  FaUserTie,
  FaCalendarAlt,
  FaClipboardList,
  FaTools,
  FaListUl,
  FaCheckCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function CreateLessonPlan() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    class: "",
    subject: "",
    teacher: "",
    academicYear: new Date().getFullYear().toString(),
    objectives: "",
    materials: "",
    procedure: "",
    assessment: "",
    status: "draft",
  });

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    // Basic validation
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
    if (!formData.academicYear.trim()) {
      toast.error("Academic year is required");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.post("/school/academics/lesson-plans", formData, headers);
      toast.success("✅ Lesson plan created successfully!");
      router.push("/school/academics/lesson-plans");
    } catch (err) {
      toast.error(err.response?.data?.message || "Creation failed");
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
            <h2 className="text-2xl font-bold text-gray-800">Create Lesson Plan</h2>
            <p className="text-sm text-gray-500">Design a structured lesson for your class</p>
          </div>
        </div>

        <form>
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Introduction to Fractions"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                required
              />
            </div>

            {/* Class & Subject */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  required
                />
              </div>
            </div>

            {/* Teacher & Academic Year */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="academicYear"
                  value={formData.academicYear}
                  onChange={handleChange}
                  placeholder="e.g. 2025"
                  className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  required
                />
              </div>
            </div>

            {/* Objectives */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <FaClipboardList size={14} /> Objectives
              </label>
              <textarea
                name="objectives"
                value={formData.objectives}
                onChange={handleChange}
                rows="2"
                placeholder="What students should learn"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-y"
              />
            </div>

            {/* Materials */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <FaTools size={14} /> Materials
              </label>
              <textarea
                name="materials"
                value={formData.materials}
                onChange={handleChange}
                rows="2"
                placeholder="List of materials needed"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-y"
              />
            </div>

            {/* Procedure */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <FaListUl size={14} /> Procedure
              </label>
              <textarea
                name="procedure"
                value={formData.procedure}
                onChange={handleChange}
                rows="3"
                placeholder="Step-by-step teaching process"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-y"
              />
            </div>

            {/* Assessment */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <FaCheckCircle size={14} /> Assessment
              </label>
              <textarea
                name="assessment"
                value={formData.assessment}
                onChange={handleChange}
                rows="2"
                placeholder="How will you assess learning?"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-y"
              />
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
              </select>
            </div>
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
              <FaSave /> {saving ? "Saving..." : "Create Lesson Plan"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}