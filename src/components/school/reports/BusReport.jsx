"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import ReportFilters from "@/components/school/reports/ReportFilters";
import ReportTable from "@/components/school/reports/ReportTable";
import ReportChart from "@/components/school/reports/ReportChart";
import { toast } from "react-toastify";

export default function BusReport() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, routes: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", class: "", status: "" });

  const fetchData = async (filterParams = {}) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      // Fetch assignments (limit large)
      const res = await api.get("/school/bus/assignments", { params: { limit: 1000, ...filterParams }, ...headers });
      const assignments = res.data.data || [];
      setData(assignments);
      // Compute stats
      const total = assignments.length;
      const active = assignments.filter(a => a.active).length;
      const routes = new Set(assignments.map(a => a.route?._id).filter(Boolean)).size;
      setStats({ total, active, routes });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load bus report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleFilter = (newFilters) => {
    setFilters(newFilters);
    fetchData(newFilters);
  };

  const columns = [
    { key: "studentName", label: "Student", render: (row) => `${row.student?.firstName || ""} ${row.student?.lastName || ""}` },
    { key: "routeName", label: "Route", render: (row) => row.route?.name || "—" },
    { key: "stop", label: "Stop" },
    { key: "status", label: "Status", render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
        {row.active ? "Active" : "Inactive"}
      </span>
    ) },
  ];

  const chartData = [
    { name: "Active", count: stats.active },
    { name: "Inactive", count: stats.total - stats.active },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-indigo-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Total Assignments</p>
          <p className="text-3xl font-bold text-indigo-600">{stats.total}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Active Assignments</p>
          <p className="text-3xl font-bold text-emerald-600">{stats.active}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Unique Routes</p>
          <p className="text-3xl font-bold text-amber-600">{stats.routes}</p>
        </div>
      </div>

      <ReportFilters onFilter={handleFilter} initialFilters={filters} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ReportChart type="pie" data={chartData} xKey="name" dataKeys={["count"]} title="Assignment Status" />
        {/* Could add bar chart per route */}
      </div>

      <ReportTable columns={columns} data={data} title="Bus Assignments" />
    </div>
  );
}