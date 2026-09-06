"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaSync,
  FaEye,
  FaChartLine,
  FaIndustry,
  FaTachometerAlt,
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

export default function WeavingWIPPage() {
  const [records, setRecords] = useState([]);
  const [efficiencyData, setEfficiencyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [machineFilter, setMachineFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [error, setError] = useState(null);

  const fetchData = useCallback(
    async (showToast = false) => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (machineFilter) params.append("machine", machineFilter);
        if (shiftFilter) params.append("shift", shiftFilter);
        const [recordsRes, effRes] = await Promise.all([
          api.get(`/textiles/weaving-wip?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get(`/textiles/weaving-wip/efficiency`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setRecords(recordsRes.data.data || []);
        setEfficiencyData(effRes.data.data);
        if (showToast) toast.success("Refreshed");
      } catch {
        setError("Failed to load data");
        toast.error("Failed to load");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, machineFilter, shiftFilter]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/textiles/weaving-wip/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted");
      fetchData();
    } catch {
      toast.error("Delete failed");
    }
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
    </tr>
  );

  const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444"];

  // Prepare chart data
  const chartData = efficiencyData?.machineWise?.map((m) => ({
    machine: m.machine?.name || "Unknown",
    efficiency: Math.round(m.avgEfficiency || 0),
    planned: m.totalPlanned || 0,
    produced: m.totalProduced || 0,
  })) || [];

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <FaTachometerAlt size={24} className="text-blue-600" />
            Weaving WIP
          </h1>
          <p className="text-sm text-gray-500">Machine‑wise weaving production tracking</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchData(true);
            }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
          >
            <FaSync className={refreshing ? "animate-spin" : ""} size={14} /> Refresh
          </button>
          <Link
            href="/admin/textiles/production/weaving-wip/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md"
          >
            <FaPlus size={12} /> New Entry
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchData(true);
          }}
          className="flex gap-2 flex-wrap"
        >
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by PO..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none w-60"
            />
          </div>
          <select
            value={machineFilter}
            onChange={(e) => setMachineFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
          >
            <option value="">All Machines</option>
            {/* Machine options will be populated from records */}
            {[...new Set(records.map(r => r.machine?._id))].map((id) => {
              const machine = records.find(r => r.machine?._id === id)?.machine;
              return machine ? (
                <option key={id} value={id}>{machine.name}</option>
              ) : null;
            })}
          </select>
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
          >
            <option value="">All Shifts</option>
            <option value="A">Shift A</option>
            <option value="B">Shift B</option>
            <option value="C">Shift C</option>
            <option value="General">General</option>
          </select>
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Search
          </button>
        </form>
        <span className="text-sm text-gray-500">{records.length} entries</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex justify-between">
          <span>{error}</span>
          <button
            onClick={() => fetchData()}
            className="px-4 py-1 bg-red-600 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Efficiency Summary Cards */}
      {efficiencyData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase">Total Planned</p>
            <p className="text-xl font-bold text-gray-800">
              {efficiencyData.overall?.totalPlanned?.toFixed(0) || 0} Mtr
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase">Total Produced</p>
            <p className="text-xl font-bold text-emerald-600">
              {efficiencyData.overall?.totalProduced?.toFixed(0) || 0} Mtr
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase">Average Efficiency</p>
            <p className="text-xl font-bold text-blue-600">
              {Math.round(efficiencyData.overall?.avgEfficiency || 0)}%
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase">Total Waste</p>
            <p className="text-xl font-bold text-amber-600">
              {efficiencyData.overall?.totalWaste?.toFixed(0) || 0} Mtr
            </p>
          </div>
        </div>
      )}

      {/* Efficiency Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-bold text-gray-700 mb-4">Machine Efficiency</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="machine" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="efficiency" fill="#6366f1" name="Efficiency %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">PO #</th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">Machine</th>
                <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase text-gray-400">Shift</th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">Planned</th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">Produced</th>
                <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase text-gray-400">Efficiency</th>
                <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                    No weaving entries found
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r._id} className="hover:bg-blue-50/20 transition">
                    <td className="px-6 py-4 font-mono text-blue-600">
                      {r.productionOrder?.orderNumber}
                    </td>
                    <td className="px-6 py-4 text-gray-800">{r.machine?.name}</td>
                    <td className="px-6 py-4 text-gray-600">{r.shift}</td>
                    <td className="px-6 py-4 text-right font-bold">{r.plannedQuantity}</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                      {r.producedQuantity}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          r.efficiency >= 90
                            ? "bg-green-100 text-green-700"
                            : r.efficiency >= 70
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {Math.round(r.efficiency)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/admin/textiles/production/weaving-wip/${r._id}`}
                        className="p-2 text-gray-400 hover:text-blue-600"
                      >
                        <FaEye size={14} />
                      </Link>
                      <Link
                        href={`/admin/textiles/production/weaving-wip/${r._id}/edit`}
                        className="p-2 text-gray-400 hover:text-blue-600"
                      >
                        <FaEdit size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(r._id)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <FaTrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}