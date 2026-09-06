"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  FaSync,
  FaCheckCircle,
  FaClock,
  FaChartLine,
  FaIndustry,
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
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function ProcessWIPPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (showToast = false) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/textiles/process-wip", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data.data);
      if (showToast) toast.success("Refreshed");
    } catch {
      setError("Failed to load WIP data");
      toast.error("Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6 bg-[#f2f5f9] min-h-screen">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 animate-pulse h-64" />
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
          <button onClick={() => fetchData()} className="px-4 py-1 bg-red-600 text-white rounded-lg text-sm">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-6 text-center">No data</div>;

  const { processes, summary, recentOutputs } = data;

  // Data for charts
  const barData = processes.map(p => ({
    process: p.process,
    Planned: p.planned,
    Done: p.done,
    Balance: p.balance,
  }));

  const pieData = [
    { name: "Completed", value: summary.totalDone },
    { name: "Pending", value: summary.totalBalance },
  ];
  const COLORS = ["#22c55e", "#f59e0b"];

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <FaIndustry size={24} className="text-blue-600" />
            Process WIP
          </h1>
          <p className="text-sm text-gray-500">Production progress by process</p>
        </div>
        <button
          onClick={() => { setRefreshing(true); fetchData(true); }}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
        >
          <FaSync className={refreshing ? "animate-spin" : ""} size={14} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <FaCheckCircle className="text-blue-500" size={20} />
            <div>
              <p className="text-xs text-gray-400 uppercase">Overall Progress</p>
              <p className="text-xl font-bold text-gray-800">{summary.overallProgress}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <FaChartLine className="text-green-500" size={20} />
            <div>
              <p className="text-xs text-gray-400 uppercase">Total Planned</p>
              <p className="text-xl font-bold text-gray-800">{summary.totalPlanned.toFixed(0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <FaCheckCircle className="text-emerald-500" size={20} />
            <div>
              <p className="text-xs text-gray-400 uppercase">Total Done</p>
              <p className="text-xl font-bold text-gray-800">{summary.totalDone.toFixed(0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <FaClock className="text-amber-500" size={20} />
            <div>
              <p className="text-xs text-gray-400 uppercase">Balance</p>
              <p className="text-xl font-bold text-amber-600">{summary.totalBalance.toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4">Process-wise Production</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="process" angle={-15} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Planned" fill="#6366f1" />
              <Bar dataKey="Done" fill="#22c55e" />
              <Bar dataKey="Balance" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4">Overall Progress</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                dataKey="value"
                label
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2 text-sm">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded-full"></span> Completed</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded-full"></span> Pending</span>
          </div>
        </div>
      </div>

      {/* Process Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {processes.map((p) => {
          const progress = p.planned > 0 ? Math.round((p.done / p.planned) * 100) : 0;
          return (
            <div key={p.process} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-gray-800">{p.process}</h4>
                <span className="text-xs font-bold text-gray-500">{p.jobCardCount} jobs</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                <div>
                  <p className="text-gray-400 text-xs">Planned</p>
                  <p className="font-bold text-gray-700">{p.planned.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Done</p>
                  <p className="font-bold text-emerald-600">{p.done.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Balance</p>
                  <p className="font-bold text-amber-600">{p.balance.toFixed(0)}</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{progress}% complete</p>
            </div>
          );
        })}
      </div>

      {/* Recent Outputs */}
      {recentOutputs && recentOutputs.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4">Recent Machine Outputs</h3>
          <div className="space-y-2">
            {recentOutputs.map((out, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <span className="font-medium text-sm">{out.jobCard?.operation || "N/A"}</span>
                  <span className="text-xs text-gray-400 ml-2">{new Date(out.date).toLocaleString()}</span>
                </div>
                <span className="font-bold text-blue-600">{out.quantity} units</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}