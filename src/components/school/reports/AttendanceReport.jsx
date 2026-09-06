"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import ReportFilters from "@/components/school/reports/ReportFilters";
import ReportTable from "@/components/school/reports/ReportTable";
import ReportChart from "@/components/school/reports/ReportChart";
import { toast } from "react-toastify";

export default function AttendanceReport() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, halfDay: 0, leave: 0, attendanceRate: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", class: "", status: "" });

  const fetchData = async (filterParams = {}) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const params = { limit: 1000, ...filterParams };
      const res = await api.get("/school/attendance/reports", { params, ...headers });
      setData(res.data.data || []);
      setStats(res.data.stats || { total: 0, present: 0, absent: 0, halfDay: 0, leave: 0, attendanceRate: 0 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load attendance report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilter = (newFilters) => {
    setFilters(newFilters);
    fetchData(newFilters);
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (row) => {
        if (row.student) return `${row.student.firstName} ${row.student.lastName}`;
        if (row.staff) return row.staff.name;
        return "—";
      },
    },
    {
      key: "class",
      label: "Class/Section",
      render: (row) => {
        if (row.student) return `Class ${row.student.class} ${row.student.section || ""}`;
        if (row.staff) return row.staff.designation || "Staff";
        return "—";
      },
    },
    {
      key: "date",
      label: "Date",
      render: (row) => new Date(row.date).toLocaleDateString(),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          row.status === "present" ? "bg-emerald-100 text-emerald-700" :
          row.status === "absent" ? "bg-red-100 text-red-700" :
          row.status === "half-day" ? "bg-amber-100 text-amber-700" :
          row.status === "leave" ? "bg-blue-100 text-blue-700" :
          "bg-gray-100 text-gray-500"
        }`}>
          {row.status}
        </span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (row) => row.type,
    },
  ];

  const chartData = [
    { name: "Present", count: stats.present },
    { name: "Absent", count: stats.absent },
    { name: "Half Day", count: stats.halfDay },
    { name: "Leave", count: stats.leave },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-indigo-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Total Records</p>
          <p className="text-3xl font-bold text-indigo-600">{stats.total}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Present</p>
          <p className="text-3xl font-bold text-emerald-600">{stats.present}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Absent</p>
          <p className="text-3xl font-bold text-red-600">{stats.absent}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Half Day</p>
          <p className="text-3xl font-bold text-amber-600">{stats.halfDay}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Attendance Rate</p>
          <p className="text-3xl font-bold text-blue-600">{stats.attendanceRate}%</p>
        </div>
      </div>

      <ReportFilters onFilter={handleFilter} initialFilters={filters} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ReportChart type="pie" data={chartData} xKey="name" dataKeys={["count"]} title="Attendance Distribution" />
        {/* Add more charts as needed */}
      </div>

      <ReportTable columns={columns} data={data} title="Attendance Report" />
    </div>
  );
}