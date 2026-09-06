"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import ReportFilters from "@/components/school/reports/ReportFilters";
import ReportTable from "@/components/school/reports/ReportTable";
import ReportChart from "@/components/school/reports/ReportChart";
import { toast } from "react-toastify";

export default function ExamsReport() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ total: 0, published: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", class: "", status: "" });

  const fetchData = async (filterParams = {}) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get("/school/exams", { params: { limit: 1000, ...filterParams }, ...headers });
      const exams = res.data.data || [];
      setData(exams);
      const total = exams.length;
      const published = exams.filter(e => e.status === "published").length;
      const completed = exams.filter(e => e.status === "completed").length;
      setStats({ total, published, completed });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load exams report");
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
    { key: "title", label: "Title" },
    { key: "class", label: "Class" },
    { key: "subject", label: "Subject" },
    { key: "date", label: "Date", render: (row) => new Date(row.date).toLocaleDateString() },
    { key: "totalMarks", label: "Marks" },
    { key: "type", label: "Type" },
    { key: "status", label: "Status", render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.status === "published" ? "bg-emerald-100 text-emerald-700" :
        row.status === "completed" ? "bg-purple-100 text-purple-700" :
        "bg-amber-100 text-amber-700"
      }`}>
        {row.status}
      </span>
    ) },
  ];

  const chartData = [
    { name: "Published", count: stats.published },
    { name: "Completed", count: stats.completed },
    { name: "Draft", count: stats.total - stats.published - stats.completed },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-indigo-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Total Exams</p>
          <p className="text-3xl font-bold text-indigo-600">{stats.total}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Published</p>
          <p className="text-3xl font-bold text-emerald-600">{stats.published}</p>
        </div>
        <div className="bg-purple-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-3xl font-bold text-purple-600">{stats.completed}</p>
        </div>
      </div>

      <ReportFilters onFilter={handleFilter} initialFilters={filters} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ReportChart type="pie" data={chartData} xKey="name" dataKeys={["count"]} title="Exam Status" />
      </div>

      <ReportTable columns={columns} data={data} title="Exams Report" />
    </div>
  );
}