"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  FaArrowLeft,
  FaSave,
  FaCalendarAlt,
  FaPlus,
  FaTrash,
  FaClock,
  FaUserTie,
  FaDoorOpen,
  FaBook,
} from "react-icons/fa";
import { toast } from "react-toastify";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function CreateTimetable() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    class: "",
    section: "",
    academicYear: new Date().getFullYear().toString(),
    schedule: days.reduce((acc, day) => ({ ...acc, [day]: [] }), {}),
  });

  const classOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

  // Add a period to a specific day
  const addPeriod = (day) => {
    setFormData((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: [
          ...prev.schedule[day],
          { subject: "", start: "", end: "", teacher: "", room: "" },
        ],
      },
    }));
  };

  // Remove a period from a specific day
  const removePeriod = (day, index) => {
    setFormData((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: prev.schedule[day].filter((_, i) => i !== index),
      },
    }));
  };

  // Update a period field
  const updatePeriod = (day, index, field, value) => {
    const updatedPeriods = [...formData.schedule[day]];
    updatedPeriods[index][field] = value;
    setFormData((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: updatedPeriods,
      },
    }));
  };

  // Handle simple text/select changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit handler
  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.class) {
      toast.error("Please select a class");
      return;
    }
    if (!formData.academicYear) {
      toast.error("Academic year is required");
      return;
    }

    // Check if at least one period is added
    const hasPeriods = Object.values(formData.schedule).some((periods) => periods.length > 0);
    if (!hasPeriods) {
      toast.warning("Add at least one period to any day");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      // Convert schedule object to array of { day, periods } format expected by API
      const payload = {
        class: formData.class,
        section: formData.section,
        academicYear: formData.academicYear,
        schedule: days.map((day) => ({
          day,
          periods: formData.schedule[day],
        })),
      };
      await api.post("/school/academics/timetable", payload, headers);
      toast.success("✅ Timetable created successfully!");
      router.push("/school/academics/timetable");
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

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 max-w-4xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
            <FaCalendarAlt size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Create Timetable</h2>
            <p className="text-sm text-gray-500">Define weekly schedule for a class</p>
          </div>
        </div>

        <form>
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                name="class"
                value={formData.class}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
              >
                <option value="">Select Class</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>Class {c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Section
              </label>
              <input
                type="text"
                name="section"
                value={formData.section}
                onChange={handleChange}
                placeholder="e.g. A"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
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
              />
            </div>
          </div>

          {/* Schedule Builder */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FaBook className="text-indigo-500" />
              Weekly Schedule
              <span className="text-sm font-normal text-gray-400 ml-2">
                (add periods per day)
              </span>
            </h3>

            <div className="space-y-6">
              {days.map((day) => {
                const periods = formData.schedule[day] || [];
                return (
                  <div key={day} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-gray-700">{day}</h4>
                      <button
                        type="button"
                        onClick={() => addPeriod(day)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition text-sm"
                      >
                        <FaPlus size={12} /> Add Period
                      </button>
                    </div>

                    {periods.length === 0 ? (
                      <p className="text-gray-400 text-sm italic">No periods added yet</p>
                    ) : (
                      <div className="space-y-3">
                        {periods.map((period, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white rounded-xl p-3 border border-gray-200 items-end"
                          >
                            <div className="md:col-span-3">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                              <input
                                type="text"
                                value={period.subject}
                                onChange={(e) =>
                                  updatePeriod(day, idx, "subject", e.target.value)
                                }
                                placeholder="e.g. Math"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Start</label>
                              <input
                                type="time"
                                value={period.start}
                                onChange={(e) =>
                                  updatePeriod(day, idx, "start", e.target.value)
                                }
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-500 mb-1">End</label>
                              <input
                                type="time"
                                value={period.end}
                                onChange={(e) =>
                                  updatePeriod(day, idx, "end", e.target.value)
                                }
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Teacher</label>
                              <input
                                type="text"
                                value={period.teacher}
                                onChange={(e) =>
                                  updatePeriod(day, idx, "teacher", e.target.value)
                                }
                                placeholder="Name"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Room</label>
                              <input
                                type="text"
                                value={period.room}
                                onChange={(e) =>
                                  updatePeriod(day, idx, "room", e.target.value)
                                }
                                placeholder="e.g. 201"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                              />
                            </div>
                            <div className="md:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => removePeriod(day, idx)}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                              >
                                <FaTrash size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl hover:shadow-lg hover:from-indigo-700 hover:to-indigo-800 transition disabled:opacity-60 shadow-md"
            >
              <FaSave /> {saving ? "Creating..." : "Create Timetable"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}