"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { FaArrowLeft, FaSave, FaSearch, FaCheck, FaTimes, FaUserClock, FaCalendarAlt } from "react-icons/fa";
import { toast } from "react-toastify";

export default function MarkAttendance() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [type, setType] = useState("student");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [attendance, setAttendance] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      if (type === "student") {
        const res = await api.get("/school/students", {
          params: { class: classFilter, limit: 1000 },
          ...headers,
        });
        setStudents(res.data.data || []);
      } else {
        const res = await api.get("/school/staff", { params: { limit: 1000 }, ...headers });
        setStaff(res.data.data || []);
      }

      // Load existing attendance
      const attRes = await api.get("/school/attendance", {
        params: { date, type },
        ...headers,
      });
      const existing = attRes.data.data || [];
      const map = {};
      existing.forEach((rec) => {
        map[rec.entityId._id] = rec.status;
      });
      setAttendance(map);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [type, date, classFilter]);

  const handleAttendanceChange = (id, status) => {
    setAttendance((prev) => ({ ...prev, [id]: prev[id] === status ? "" : status }));
  };

  const handleSubmit = async () => {
    const records = Object.entries(attendance)
      .filter(([_, status]) => status)
      .map(([entityId, status]) => ({ entityId, status }));

    if (records.length === 0) {
      toast.warning("Please mark attendance for at least one person");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const payload = { date, type, records };
      await api.post("/school/attendance", payload, headers);
      toast.success("✅ Attendance saved successfully!");
      setTimeout(() => router.push("/school/attendance"), 1200);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      present: "bg-emerald-100 text-emerald-700 border-emerald-200",
      absent: "bg-red-100 text-red-700 border-red-200",
      "half-day": "bg-amber-100 text-amber-700 border-amber-200",
      leave: "bg-blue-100 text-blue-700 border-blue-200",
    };
    return styles[status] || "bg-gray-100 text-gray-500 border-gray-200";
  };

  const items = type === "student" ? students : staff;
  const filteredItems = items.filter((item) => {
    const fullName = `${item.firstName} ${item.lastName}`.toLowerCase();
    const id = (item.studentId || item.staffId || "").toLowerCase();
    return fullName.includes(search.toLowerCase()) || id.includes(search.toLowerCase());
  });

  const classOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="p-3 rounded-2xl bg-white shadow-sm hover:bg-gray-100 transition-all">
            <FaArrowLeft size={22} />
          </button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Mark Attendance
          </h1>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-wrap items-end gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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

          {type === "student" && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Class</label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
              >
                <option value="">All Classes</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>Class {c}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1 min-w-[250px]">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Search</label>
            <div className="relative">
              <FaSearch className="absolute left-4 top-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 pr-4 py-3 w-full border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading {type}s...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center text-gray-400">
            No {type}s found
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">#</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                    {type === "student" && (
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Class</th>
                    )}
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Mark Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <AnimatePresence>
                    {filteredItems.map((item, idx) => {
                      const entityId = item._id;
                      const currentStatus = attendance[entityId] || "";
                      return (
                        <motion.tr
                          key={entityId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="hover:bg-indigo-50/50 transition-all"
                        >
                          <td className="px-6 py-5 text-gray-400 text-sm">{idx + 1}</td>
                          <td className="px-6 py-5 font-mono text-gray-600">{item.studentId || item.staffId}</td>
                          <td className="px-6 py-5 font-medium">{item.firstName} {item.lastName}</td>
                          {type === "student" && (
                            <td className="px-6 py-5 text-gray-600">
                              {item.class}{item.section ? `-${item.section}` : ""}
                            </td>
                          )}
                          <td className="px-6 py-5">
                            <div className="flex justify-center gap-2 flex-wrap">
                              {["present", "absent", "half-day", "leave"].map((status) => (
                                <button
                                  key={status}
                                  onClick={() => handleAttendanceChange(entityId, status)}
                                  className={`px-4 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                                    currentStatus === status
                                      ? getStatusColor(status)
                                      : "bg-white border-gray-200 hover:border-gray-300 text-gray-500"
                                  }`}
                                >
                                  {status.replace("-", " ")}
                                </button>
                              ))}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={() => router.back()}
            className="px-8 py-3 border border-gray-300 rounded-2xl text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-3 px-10 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg disabled:opacity-70 transition"
          >
            <FaSave /> {saving ? "Saving Attendance..." : "Save Attendance"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function
const getStatusColor = (status) => {
  const colors = {
    present: "bg-emerald-100 text-emerald-700 border-emerald-200",
    absent: "bg-red-100 text-red-700 border-red-200",
    "half-day": "bg-amber-100 text-amber-700 border-amber-200",
    leave: "bg-blue-100 text-blue-700 border-blue-200",
  };
  return colors[status] || "";
};