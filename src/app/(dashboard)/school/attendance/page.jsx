"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  FaCalendarCheck,
  FaUsers,
  FaUserCheck,
  FaUserTimes,
  FaUserClock,
  FaChartBar,
  FaArrowRight,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function AttendanceDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    halfDay: 0,
    leave: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState("student");

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get("/school/attendance/stats", {
        params: { date: selectedDate, type },
        ...headers,
      });
      setStats(res.data.data || { present: 0, absent: 0, halfDay: 0, leave: 0, total: 0 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load attendance stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedDate, type]);

  const statusCards = [
    {
      label: "Present",
      value: stats.present,
      icon: FaUserCheck,
      color: "emerald",
    },
    {
      label: "Absent",
      value: stats.absent,
      icon: FaUserTimes,
      color: "red",
    },
    {
      label: "Half Day",
      value: stats.halfDay,
      icon: FaUserClock,
      color: "amber",
    },
    {
      label: "Leave",
      value: stats.leave,
      icon: FaCalendarCheck,
      color: "blue",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
              <FaCalendarCheck size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Attendance Dashboard</h1>
              <p className="text-gray-500 mt-1">Real-time attendance overview</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/school/attendance/mark")}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:shadow-xl hover:bg-indigo-700 transition font-medium"
            >
              <FaCalendarCheck /> Mark Attendance
            </button>
            <button
              onClick={() => router.push("/school/attendance/reports")}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:shadow-xl hover:bg-emerald-700 transition font-medium"
            >
              <FaChartBar /> Reports
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 mb-8 flex flex-wrap items-center gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
            >
              <option value="student">Students</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          <button
            onClick={fetchStats}
            className="mt-6 px-6 py-3 bg-indigo-100 text-indigo-700 rounded-2xl hover:bg-indigo-200 transition font-medium"
          >
            Refresh Data
          </button>
        </div>

        {/* Total + Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          {/* Total Card */}
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 col-span-1 md:col-span-1"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-500">TOTAL</p>
              <FaUsers className="text-2xl text-gray-400" />
            </div>
            <p className="text-5xl font-bold text-gray-900">{stats.total || 0}</p>
          </motion.div>

          {/* Status Cards */}
          {statusCards.map((card, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -4 }}
              className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <div className={`p-2 rounded-2xl bg-${card.color}-100`}>
                  <card.icon className={`text-${card.color}-600 text-xl`} />
                </div>
              </div>
              <p className={`text-4xl font-bold text-${card.color}-600`}>{card.value}</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.total ? ((card.value / stats.total) * 100).toFixed(1) : 0}% of total
              </p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h2 className="font-bold text-xl text-gray-800 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => router.push("/school/attendance/mark")}
              className="p-6 bg-indigo-50 hover:bg-indigo-100 rounded-3xl text-left transition group flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-indigo-700">Mark Attendance</p>
                <p className="text-sm text-indigo-500">Today's attendance</p>
              </div>
              <FaArrowRight className="text-indigo-400 group-hover:translate-x-1 transition" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => router.push("/school/attendance/reports")}
              className="p-6 bg-emerald-50 hover:bg-emerald-100 rounded-3xl text-left transition group flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-emerald-700">View Reports</p>
                <p className="text-sm text-emerald-500">Monthly & yearly reports</p>
              </div>
              <FaArrowRight className="text-emerald-400 group-hover:translate-x-1 transition" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => router.push("/school/settings")}
              className="p-6 bg-amber-50 hover:bg-amber-100 rounded-3xl text-left transition group flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-amber-700">Settings</p>
                <p className="text-sm text-amber-500">Attendance configuration</p>
              </div>
              <FaArrowRight className="text-amber-400 group-hover:translate-x-1 transition" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}