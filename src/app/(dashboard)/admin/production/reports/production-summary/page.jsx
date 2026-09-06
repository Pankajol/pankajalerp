"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaCalendarAlt, FaChartBar, FaArrowLeft, FaIndustry } from "react-icons/fa";
import { useRouter } from "next/navigation";

const getOrderField = (order, cap, low) => {
  if (!order) return 0;
  const val = order[cap] ?? order[low];
  return Number(val) || 0;
};

const SectionCard = ({ icon, title, subtitle, children, color = "indigo" }) => {
  const colors = {
    indigo: "bg-indigo-50/40 border-indigo-100",
    emerald: "bg-emerald-50/40 border-emerald-100",
    amber: "bg-amber-50/40 border-amber-100",
    blue: "bg-blue-50/40 border-blue-100",
    red: "bg-red-50/40 border-red-100",
  };
  const bg = colors[color] || colors.indigo;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
      <div className={`flex items-center gap-3 px-6 py-4 border-b ${bg}`}>
        <div className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center text-indigo-500">
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color = "indigo" }) => {
  const map = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    gray: "bg-gray-50 text-gray-600",
  };
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl ${map[color] || map.indigo} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
};

export default function ProductionSummary() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("day"); // day or week
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/production-orders?_=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(Array.isArray(res.data) ? res.data : res.data?.orders || []);
    } catch (err) {
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filter by date
  const filteredOrders = orders.filter((o) => {
    const date = new Date(o.productionDate || o.createdAt);
    if (startDate && date < new Date(startDate)) return false;
    if (endDate && date > new Date(endDate)) return false;
    return true;
  });

  // Group by day or week
  const getKey = (date) => {
    const d = new Date(date);
    if (groupBy === "day") {
      return d.toISOString().slice(0, 10);
    } else {
      // Week: get start of week (Monday)
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      return monday.toISOString().slice(0, 10);
    }
  };

  const groups = filteredOrders.reduce((acc, o) => {
    const key = getKey(o.productionDate || o.createdAt);
    if (!acc[key]) {
      acc[key] = {
        date: key,
        orderCount: 0,
        totalQty: 0,
        totalReceived: 0,
        totalCost: 0,
        avgEfficiency: 0,
      };
    }
    acc[key].orderCount += 1;
    acc[key].totalQty += o.quantity || 0;
    acc[key].totalReceived += getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty');
    acc[key].totalCost += (o.rate || 0) * (o.quantity || 0);
    return acc;
  }, {});

  const summaryData = Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
  summaryData.forEach((g) => {
    g.avgEfficiency = g.totalQty > 0 ? (g.totalReceived / g.totalQty) * 100 : 0;
  });

  const totalOrders = summaryData.reduce((s, g) => s + g.orderCount, 0);
  const totalQty = summaryData.reduce((s, g) => s + g.totalQty, 0);
  const totalCost = summaryData.reduce((s, g) => s + g.totalCost, 0);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <ToastContainer position="bottom-right" theme="colored" />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/admin/production/reports")} className="text-gray-400 hover:text-indigo-600">
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Production Summary</h1>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5">Group By</label>
              <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 outline-none">
                <option value="day">Day</option>
                <option value="week">Week</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 outline-none" />
            </div>
            <div className="flex items-end">
              <button onClick={() => { setStartDate(""); setEndDate(""); }} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200">Clear</button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Periods" value={summaryData.length} icon={<FaCalendarAlt />} color="indigo" />
          <StatCard label="Total Orders" value={totalOrders} icon={<FaIndustry />} color="amber" />
          <StatCard label="Total Qty" value={totalQty} icon={<FaChartBar />} color="emerald" />
        </div>

        {/* Table */}
        <SectionCard icon={<FaChartBar />} title={`${groupBy === "day" ? "Daily" : "Weekly"} Summary`} color="blue">
          {summaryData.length === 0 ? (
            <p className="text-center text-gray-400 italic py-6">No data for the selected period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-400">Date</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Orders</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Planned Qty</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Received</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-400">Efficiency</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-gray-400">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {summaryData.map((g) => (
                    <tr key={g.date} className="hover:bg-indigo-50/20">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">{g.date}</td>
                      <td className="px-4 py-3 text-center">{g.orderCount}</td>
                      <td className="px-4 py-3 text-center font-mono">{g.totalQty}</td>
                      <td className="px-4 py-3 text-center font-mono text-emerald-600">{g.totalReceived}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold">{Math.round(g.avgEfficiency)}%</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">₹{g.totalCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
