"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import ReportFilters from "@/components/school/reports/ReportFilters";
import ReportTable from "@/components/school/reports/ReportTable";
import ReportChart from "@/components/school/reports/ReportChart";
import { toast } from "react-toastify";

export default function FeesReport() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, totalAmount: 0, paidAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", class: "", status: "" });

  const fetchData = async (filterParams = {}) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get("/school/fees", { params: { limit: 1000, ...filterParams }, ...headers });
      const fees = res.data.data || [];
      setData(fees);
      const total = fees.length;
      const paid = fees.filter(f => f.status === "paid").length;
      const pending = total - paid;
      const totalAmount = fees.reduce((sum, f) => sum + (f.amount || 0), 0);
      const paidAmount = fees.filter(f => f.status === "paid").reduce((sum, f) => sum + (f.amount || 0), 0);
      setStats({ total, paid, pending, totalAmount, paidAmount });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load fees report");
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
    { key: "feeHead", label: "Fee Head" },
    { key: "studentName", label: "Student", render: (row) => `${row.student?.firstName || ""} ${row.student?.lastName || ""}` },
    { key: "amount", label: "Amount", render: (row) => `₹${row.amount || 0}` },
    { key: "dueDate", label: "Due Date", render: (row) => new Date(row.dueDate).toLocaleDateString() },
    { key: "status", label: "Status", render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
        {row.status}
      </span>
    ) },
  ];

  const chartData = [
    { name: "Paid", count: stats.paid },
    { name: "Pending", count: stats.pending },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-indigo-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Total Records</p>
          <p className="text-3xl font-bold text-indigo-600">{stats.total}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-3xl font-bold text-emerald-600">{stats.paid}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="bg-purple-50 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-3xl font-bold text-purple-600">₹{stats.totalAmount}</p>
        </div>
      </div>

      <ReportFilters onFilter={handleFilter} initialFilters={filters} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ReportChart type="pie" data={chartData} xKey="name" dataKeys={["count"]} title="Fee Status" />
      </div>

      <ReportTable columns={columns} data={data} title="Fees Report" />
    </div>
  );
}