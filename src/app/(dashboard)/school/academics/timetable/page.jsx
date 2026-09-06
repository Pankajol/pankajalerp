"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  FaCalendarAlt,
  FaSearch,
  FaClock,
  FaUserTie,
  FaDoorOpen,
  FaPlus,
} from "react-icons/fa";
import { toast } from "react-toastify";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function TimetablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [timetable, setTimetable] = useState(null);
  const [classFilter, setClassFilter] = useState("");
  const [section, setSection] = useState("");
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());

  const fetchTimetable = async () => {
    if (!classFilter) {
      toast.warning("Please select a class");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const params = { class: classFilter, section, academicYear };
      const res = await api.get("/school/academics/timetable", { params, ...headers });
      setTimetable(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load timetable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classFilter) fetchTimetable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classFilter, section, academicYear]);

  const classOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

  // Helper to get teacher name
  const getTeacherName = (teacher) => {
    if (!teacher) return "—";
    if (typeof teacher === "object") {
      return `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim() || "—";
    }
    return teacher;
  };

  return (
    <div>
      {/* Header with Class Info and Actions */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaCalendarAlt className="text-indigo-500" size={24} />
            Timetable
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {classFilter ? (
              <>Class {classFilter}{section && ` - Section ${section}`} · {academicYear}</>
            ) : (
              "Select a class to view timetable"
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Create button - always visible */}
          <button
            onClick={() => router.push("/school/academics/timetable/create")}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition shadow-md"
          >
            <FaPlus size={16} /> Create
          </button>
          {classFilter && timetable && (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-indigo-50 px-4 py-2 rounded-2xl">
              <FaClock className="text-indigo-400" />
              <span>Last updated: {new Date(timetable.updatedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            Class
          </label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full px-5 py-3 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
          >
            <option value="">Select Class</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </select>
        </div>

        <div className="w-28">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            Section
          </label>
          <input
            type="text"
            placeholder="A"
            value={section}
            onChange={(e) => setSection(e.target.value.toUpperCase())}
            className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
          />
        </div>

        <div className="w-36">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            Academic Year
          </label>
          <input
            type="text"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
          />
        </div>

        {/* Manual refresh button (optional) */}
        <button
          onClick={fetchTimetable}
          className="mt-6 px-6 py-3 bg-indigo-100 text-indigo-700 rounded-2xl hover:bg-indigo-200 transition font-medium flex items-center gap-2"
        >
          <FaSearch size={14} /> Refresh
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-3xl shadow-sm border border-gray-100 p-4 flex items-center gap-6">
              <div className="w-24 h-12 bg-gray-200 rounded-2xl"></div>
              <div className="flex-1 grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, j) => (
                  <div key={j} className="h-16 bg-gray-100 rounded-2xl"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : timetable ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50 to-indigo-100/50">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-indigo-700 w-28">
                    Day
                  </th>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <th key={i} className="px-2 py-4 text-center text-xs font-bold uppercase tracking-wider text-indigo-700">
                      P{i+1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {days.map((day) => {
                  const daySchedule = timetable.schedule?.find((d) => d.day === day);
                  const periods = daySchedule?.periods || [];
                  return (
                    <tr key={day} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 font-bold text-gray-800">
                        {day}
                      </td>
                      {Array.from({ length: 7 }).map((_, idx) => {
                        const period = periods[idx];
                        return (
                          <td key={idx} className="px-2 py-3">
                            {period ? (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.02 }}
                                className="bg-white rounded-2xl border border-gray-100 p-2 shadow-sm hover:shadow-md transition"
                              >
                                <div className="font-semibold text-indigo-700 text-xs truncate">
                                  {period.subject}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                                  <FaClock size={10} />
                                  <span>{period.start}–{period.end}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                                  <FaUserTie size={10} />
                                  <span className="truncate">
                                    {getTeacherName(period.teacher)}
                                  </span>
                                </div>
                                {period.room && (
                                  <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                                    <FaDoorOpen size={10} />
                                    <span>{period.room}</span>
                                  </div>
                                )}
                              </motion.div>
                            ) : (
                              <div className="text-gray-200 text-center">—</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-gray-100">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <FaCalendarAlt size={40} className="text-indigo-300" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700">No Timetable Loaded</h3>
          <p className="text-gray-400 mt-1 max-w-sm">
            Select a class, section, and academic year, then click "Refresh" or create a new timetable.
          </p>
          <div className="flex gap-4 mt-6">
            {!classFilter && (
              <button
                onClick={() => document.querySelector("select")?.focus()}
                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition shadow-md"
              >
                Select a Class
              </button>
            )}
            <button
              onClick={() => router.push("/school/academics/timetable/create")}
              className="px-6 py-3 bg-indigo-100 text-indigo-700 rounded-2xl hover:bg-indigo-200 transition"
            >
              Create New Timetable
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
