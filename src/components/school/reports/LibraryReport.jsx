"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import ReportFilters from "./ReportFilters";
import ReportTable from "./ReportTable";
import ReportChart from "./ReportChart";
import { toast } from "react-toastify";

export default function LibraryReport() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ totalBooks: 0, borrowed: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", class: "", status: "" });

  const fetchData = async (filterParams = {}) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      // For library report, we can use borrowings endpoint with filters
      const params = { limit: 1000, ...filterParams };
      const res = await api.get("/school/library/borrowings", { params, ...headers });
      const borrowings = res.data.data || [];
      setData(borrowings);
      // Compute stats
      const total = borrowings.length;
      const borrowed = borrowings.filter((b) => b.status === "borrowed").length;
      const overdue = borrowings.filter((b) => b.status === "overdue").length;
      setStats({ totalBooks: total, borrowed, overdue });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load library report");
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
    { key: "bookId", label: "Book ID" },
    { key: "bookTitle", label: "Title", render: (row) => row.book?.title || "—" },
    { key: "studentName", label: "Student", render: (row) => `${row.student?.firstName || ""} ${row.student?.lastName || ""}` },
    { key: "borrowedDate", label: "Borrowed", render: (row) => new Date(row.borrowedDate).toLocaleDateString() },
    { key: "dueDate", label: "Due Date", render: (row) => new Date(row.dueDate).toLocaleDateString() },
    { key: "status", label: "Status", render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.status === "borrowed" ? "bg-amber-100 text-amber-700" :
        row.status === "overdue" ? "bg-red-100 text-red-700" :
        "bg-emerald-100 text-emerald-700"
      }`}>
        {row.status}
      </span>
    ) },
  ];

  // Chart data: status counts
  const chartData = [
    { name: "Borrowed", count: stats.borrowed },
    { name: "Overdue", count: stats.overdue },
    { name: "Returned", count: stats.totalBooks - stats.borrowed - stats.overdue },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-indigo-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Total Borrowings</p>
          <p className="text-3xl font-bold text-indigo-600">{stats.totalBooks}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Active Borrowings</p>
          <p className="text-3xl font-bold text-amber-600">{stats.borrowed}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Overdue</p>
          <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
        </div>
      </div>

      <ReportFilters onFilter={handleFilter} initialFilters={filters} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ReportChart type="pie" data={chartData} xKey="name" dataKeys={["count"]} title="Borrowing Status" />
        {/* Add more charts as needed */}
      </div>

      <ReportTable columns={columns} data={data} title="Library Borrowings" />
    </div>
  );
}