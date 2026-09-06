"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { FaArrowLeft, FaFileExport, FaSearch, FaCalendarAlt } from "react-icons/fa";
import { toast } from "react-toastify";

export default function AttendanceReports() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState([]);
  const [type, setType] = useState("student");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get("/school/attendance/reports", {
        params: { type, from: fromDate, to: toDate },
        ...headers,
      });
      setReport(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [type, fromDate, toDate]);

  const filteredReport = report.filter((item) => {
    const name = `${item.entity?.firstName || ""} ${item.entity?.lastName || ""}`.toLowerCase();
    const id = item.entity?.studentId || item.entity?.staffId || "";
    return name.includes(search.toLowerCase()) || id.includes(search);
  });

  const exportCsv = () => {
    if (filteredReport.length === 0) {
      toast.info("No report rows to export");
      return;
    }

    const columns = ["#", "ID", "Name", "Present", "Absent", "Half Day", "Leave", "Total Days", "% Attendance"];
    const escapeCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = filteredReport.map((item, idx) => {
      const percentage = Number(item.presentPercentage || 0).toFixed(1);
      return [
        idx + 1,
        item.entity?.studentId || item.entity?.staffId || "",
        `${item.entity?.firstName || ""} ${item.entity?.lastName || ""}`.trim(),
        item.present || 0,
        item.absent || 0,
        item.halfDay || 0,
        item.leave || 0,
        item.total || 0,
        percentage,
      ].map(escapeCell).join(",");
    });

    const csv = [columns.map(escapeCell).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${type}-${fromDate}-to-${toDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="p-3 rounded-2xl bg-white shadow-sm hover:bg-gray-100 transition-all">
            <FaArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Attendance Reports
            </h1>
            <p className="text-gray-500 mt-1">Detailed attendance analytics</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-wrap items-end gap-6">
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

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>

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

          <button
            onClick={exportCsv}
            className="px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition flex items-center gap-2"
          >
            <FaFileExport /> Export CSV
          </button>
        </div>

        {/* Report Table */}
        {loading ? (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading report...</p>
          </div>
        ) : filteredReport.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center text-gray-400">
            No attendance data found for the selected period
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">#</th>
                    <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ID</th>
                    <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                    <th className="px-6 py-5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Present</th>
                    <th className="px-6 py-5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Absent</th>
                    <th className="px-6 py-5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Half Day</th>
                    <th className="px-6 py-5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Leave</th>
                    <th className="px-6 py-5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Total Days</th>
                    <th className="px-6 py-5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">% Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredReport.map((item, idx) => {
                    const percentage = item.presentPercentage || 0;
                    return (
                      <motion.tr
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="hover:bg-indigo-50/50 transition-all"
                      >
                        <td className="px-6 py-5 text-gray-400 text-sm">{idx + 1}</td>
                        <td className="px-6 py-5 font-mono text-gray-600">
                          {item.entity?.studentId || item.entity?.staffId || "—"}
                        </td>
                        <td className="px-6 py-5 font-medium">
                          {item.entity?.firstName} {item.entity?.lastName}
                        </td>
                        <td className="px-6 py-5 text-center font-bold text-emerald-600">{item.present || 0}</td>
                        <td className="px-6 py-5 text-center font-bold text-red-600">{item.absent || 0}</td>
                        <td className="px-6 py-5 text-center font-bold text-amber-600">{item.halfDay || 0}</td>
                        <td className="px-6 py-5 text-center font-bold text-blue-600">{item.leave || 0}</td>
                        <td className="px-6 py-5 text-center font-bold text-gray-700">{item.total || 0}</td>
                        <td className="px-6 py-5 text-center">
                          <span className={`inline-block px-4 py-1 text-xs font-semibold rounded-full ${
                            percentage >= 80 ? "bg-emerald-100 text-emerald-700" :
                            percentage >= 60 ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {Number(percentage).toFixed(1)}%
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
