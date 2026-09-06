// app/admin/textiles/reports/page.jsx
"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { FaChartLine, FaRecycle, FaIndustry, FaBox } from "react-icons/fa";
import { toast } from "react-toastify";

export default function TextileReportsPage() {
  const [loading, setLoading] = useState(true);
  const [efficiency, setEfficiency] = useState({ overall: 85, machine: 90 });
  const [wasteData, setWasteData] = useState([]);
  const [shadeSales, setShadeSales] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      // Simulate API calls – replace with actual endpoints
      const [wasteRes, shadeRes] = await Promise.all([
        api.get("/textiles/reports/waste", headers),
        api.get("/textiles/reports/shade-sales", headers),
      ]);

      setWasteData(wasteRes.data.data || [
        { month: "Jan", waste: 12 },
        { month: "Feb", waste: 15 },
        { month: "Mar", waste: 10 },
        { month: "Apr", waste: 18 },
        { month: "May", waste: 8 },
        { month: "Jun", waste: 14 },
      ]);
      setShadeSales(shadeRes.data.data || [
        { name: "Red", value: 400 },
        { name: "Blue", value: 300 },
        { name: "Green", value: 200 },
        { name: "Yellow", value: 100 },
      ]);
    } catch (err) {
      setError("Failed to load reports");
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#6366f1", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444"];

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <FaChartLine size={28} className="text-indigo-600" />
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Textile Reports</h1>
          <p className="text-sm text-gray-500">Waste, efficiency & shade-wise performance</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">⚠️ {error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
              <div className="h-48 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <FaRecycle className="text-emerald-500 text-xl" />
                <div>
                  <p className="text-xs text-gray-400 uppercase">Overall Waste</p>
                  <p className="text-xl font-bold text-gray-800">12.4%</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <FaIndustry className="text-blue-500 text-xl" />
                <div>
                  <p className="text-xs text-gray-400 uppercase">Machine Efficiency</p>
                  <p className="text-xl font-bold text-gray-800">88%</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <FaBox className="text-amber-500 text-xl" />
                <div>
                  <p className="text-xs text-gray-400 uppercase">Total Lots</p>
                  <p className="text-xl font-bold text-gray-800">42</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <FaChartLine className="text-purple-500 text-xl" />
                <div>
                  <p className="text-xs text-gray-400 uppercase">Shades Used</p>
                  <p className="text-xl font-bold text-gray-800">18</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Waste Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Monthly Waste %</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={wasteData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="waste" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Shade Sales Pie */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Shade-wise Sales</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={shadeSales}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label
                  >
                    {shadeSales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
