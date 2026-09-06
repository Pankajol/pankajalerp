"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { FaArrowLeft, FaSave, FaPalette, FaQuoteLeft } from "react-icons/fa";
import { toast } from "react-toastify";

export default function CreateHouse() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    color: "#6366f1",
    motto: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      toast.error("House name is required");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await api.post("/school/academics/houses", formData, headers);
      toast.success("🏠 House created successfully!");
      router.push("/school/academics/houses");
    } catch (err) {
      toast.error(err.response?.data?.message || "Creation failed");
    } finally {
      setSaving(false);
    }
  };

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
        className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 max-w-2xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
            <FaPalette size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Create New House</h2>
            <p className="text-sm text-gray-500">Add a new house for student grouping</p>
          </div>
        </div>

        <form>
          <div className="space-y-6">
            {/* House Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                House Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Griffin, Phoenix, Dragon"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                required
              />
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Color <span className="text-gray-400 text-xs font-normal">(choose a signature colour)</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className="w-16 h-16 rounded-2xl border-2 border-gray-200 cursor-pointer hover:border-indigo-300 transition"
                />
                <span className="text-sm text-gray-500 font-mono">{formData.color.toUpperCase()}</span>
              </div>
            </div>

            {/* Motto */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                <span className="flex items-center gap-1">
                  <FaQuoteLeft size={14} /> Motto
                </span>
                <span className="text-gray-400 text-xs font-normal ml-1">(optional)</span>
              </label>
              <input
                type="text"
                name="motto"
                value={formData.motto}
                onChange={handleChange}
                placeholder="e.g. 'Strength in Unity'"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              />
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
              <FaSave /> {saving ? "Saving..." : "Create House"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}