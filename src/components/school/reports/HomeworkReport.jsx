"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import ReportFilters from "@/components/school/reports/ReportFilters";
import ReportTable from "@/components/school/reports/ReportTable";
import ReportChart from "@/components/school/reports/ReportChart";
import { toast } from "react-toastify";

export default function HomeworkReport() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ total: 0, submitted: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", class: "", status: "" });

  const fetchData = async (filterParams = {}) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get("/school/homework", { params: { limit: 1000, ...filterParams }, ...headers });
      const homeworks = res.data.data || [];
      setData(homeworks);
      const total = homeworks.length;
      let submitted = 0;
      homeworks.forEach(hw => {
        if (hw.submissions && hw.submissions.length > 0) submitted++;
      });
      const pending = total - submitted;
      setStats({ total, submitted, pending });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load homework report");
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
    { key: "dueDate", label: "Due Date", render: (row) => new Date(row.dueDate).toLocaleDateString() },
    { key: "submissionsCount", label: "Submissions", render: (row) => row.submissions?.length || 0 },
    { key: "status", label: "Status", render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${(row.submissions && row.submissions.length > 0) ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
        {(row.submissions && row.submissions.length > 0) ? "Has Submissions" : "No Submissions"}
      </span>
    ) },
  ];

  const chartData = [
    { name: "With Submissions", count: stats.submitted },
    { name: "No Submissions", count: stats.pending },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-indigo-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Total Homework</p>
          <p className="text-3xl font-bold text-indigo-600">{stats.total}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">With Submissions</p>
          <p className="text-3xl font-bold text-emerald-600">{stats.submitted}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">No Submissions</p>
          <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
        </div>
      </div>

      <ReportFilters onFilter={handleFilter} initialFilters={filters} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ReportChart type="pie" data={chartData} xKey="name" dataKeys={["count"]} title="Submission Status" />
      </div>

      <ReportTable columns={columns} data={data} title="Homework Report" />
    </div>
  );
}