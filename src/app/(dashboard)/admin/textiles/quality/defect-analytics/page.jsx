"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  FaSync,
  FaChartPie,
  FaChartBar,
  FaChartLine,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9"];

export default function DefectAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState(
    new Date().toISOString().split("T")[0]
  );

  const fetchData = useCallback(
    async (showToast = false) => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams();
        if (dateFrom) params.append("dateFrom", dateFrom);
        if (dateTo) params.append("dateTo", dateTo);
        const res = await api.get(`/textiles/defect-analytics?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data.data);
        if (showToast) toast.success("Refreshed");
      } catch {
        setError("Failed to load defect analytics");
        toast.error("Failed to load");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dateFrom, dateTo]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6 bg-[#f2f5f9] min-h-screen">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse h-64" />
          <div className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-[#f2f5f9] min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex justify-between">
          <span>{error}</span>
          <button onClick={() => fetchData()} className="px-4 py-1 bg-red-600 text-white rounded-lg text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-6 text-center">No data</div>;

  const { summary, pareto, trend, severityCounts, gradeCounts } = data;

  // Prepare pie chart data
  const severityPie = [
    { name: "Minor", value: severityCounts.minor || 0 },
    { name: "Major", value: severityCounts.major || 0 },
    { name: "Critical", value: severityCounts.critical || 0 },
  ].filter((d) => d.value > 0);

  const gradePie = Object.entries(gradeCounts)
    .map(([grade, count]) => ({ name: grade, value: count }))
    .filter((d) => d.value > 0);

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <FaChartPie size={24} className="text-red-500" />
            Defect Analytics
          </h1>
          <p className="text-sm text-gray-500">Quality defect patterns & trends analysis</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <FaCalendarAlt size={14} className="text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-400 outline-none"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-400 outline-none"
            />
          </div>
          <button
            onClick={() => {
              setRefreshing(true);
              fetchData(true);
            }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            <FaSync className={refreshing ? "animate-spin" : ""} size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">Inspections</p>
          <p className="text-xl font-bold text-gray-800">{summary.totalInspections}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">Pass Rate</p>
          <p className={`text-xl font-bold ${summary.passRate >= 80 ? "text-green-600" : "text-red-600"}`}>
            {summary.passRate}%
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">Total Defects</p>
          <p className="text-xl font-bold text-red-600">{summary.totalDefects}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">Defect Types</p>
          <p className="text-xl font-bold text-gray-800">{summary.uniqueDefectTypes}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">Defects / Taka</p>
          <p className="text-xl font-bold text-amber-600">{summary.defectPerTaka}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">Takas</p>
          <p className="text-xl font-bold text-gray-800">{summary.totalTakas}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pareto Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <FaChartBar size={16} /> Pareto – Top Defects
          </h3>
          {pareto.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No defects recorded</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pareto}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" angle={-15} textAnchor="end" height={80} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#6366f1" name="Count" />
                <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#ef4444" name="Cumulative %" />
              </BarChart>
            </ResponsiveContainer>
          )}
          <p className="text-xs text-gray-400 mt-2">* Pareto principle – 80% of defects from top 20% types</p>
        </div>

        {/* Defect Trend */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <FaChartLine size={16} /> Defect Trend
          </h3>
          {trend.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No trend data</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-15} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#f59e0b" name="Defects" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4">Severity Distribution</h3>
          {severityPie.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No severity data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={severityPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  dataKey="value"
                  label
                >
                  {severityPie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Grade Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4">Grade Distribution</h3>
          {gradePie.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No grade data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={gradePie}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  dataKey="value"
                  label
                >
                  {gradePie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4">Quick Insights</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
              <span className="flex items-center gap-2">
                <FaCheckCircle className="text-green-600" />
                <span className="text-sm">Pass Rate</span>
              </span>
              <span className="text-lg font-bold text-green-600">{summary.passRate}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
              <span className="flex items-center gap-2">
                <FaTimesCircle className="text-red-600" />
                <span className="text-sm">Fail Rate</span>
              </span>
              <span className="text-lg font-bold text-red-600">{100 - summary.passRate}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
              <span className="flex items-center gap-2">
                <FaExclamationTriangle className="text-amber-600" />
                <span className="text-sm">Critical Defects</span>
              </span>
              <span className="text-lg font-bold text-amber-600">{severityCounts.critical || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
              <span className="flex items-center gap-2">
                <FaChartPie className="text-blue-600" />
                <span className="text-sm">Top Defect</span>
              </span>
              <span className="text-sm font-bold text-blue-600">
                {pareto.length > 0 ? pareto[0].type : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}