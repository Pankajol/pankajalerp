"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaIndustry,
  FaCheck,
  FaSpinner,
  FaChartBar,
  FaTruck,
  FaTools,
  FaCheckCircle,
  FaPercentage,
  FaCalendarAlt,
  FaCar,
  FaPrint,
  FaFileExport,
  FaCarSide
} from "react-icons/fa";
import { useRouter } from "next/navigation";

// ─── Helper ──────────────────────────────────────────────────────
const getOrderField = (order, capitalKey, lowerKey) => {
  if (!order) return 0;
  const val = order[capitalKey] ?? order[lowerKey];
  return Number(val) || 0;
};

// ─── Professional Section Card ──────────────────────────────────
const SectionCard = ({ icon: Icon, title, subtitle, children, color = "indigo" }) => {
  const colorMap = {
    indigo: { border: "border-indigo-100", headerBg: "bg-gradient-to-r from-indigo-50/80 to-white", iconBg: "bg-indigo-100", iconText: "text-indigo-600" },
    emerald: { border: "border-emerald-100", headerBg: "bg-gradient-to-r from-emerald-50/80 to-white", iconBg: "bg-emerald-100", iconText: "text-emerald-600" },
    amber: { border: "border-amber-100", headerBg: "bg-gradient-to-r from-amber-50/80 to-white", iconBg: "bg-amber-100", iconText: "text-amber-600" },
    blue: { border: "border-blue-100", headerBg: "bg-gradient-to-r from-blue-50/80 to-white", iconBg: "bg-blue-100", iconText: "text-blue-600" },
    red: { border: "border-red-100", headerBg: "bg-gradient-to-r from-red-50/80 to-white", iconBg: "bg-red-100", iconText: "text-red-600" },
  };
  const c = colorMap[color] || colorMap.indigo;
  return (
    <div className={`bg-white rounded-2xl shadow-md border ${c.border} overflow-hidden mb-6 transition-all hover:shadow-lg`}>
      <div className={`flex items-center gap-3 px-6 py-4 border-b ${c.border} ${c.headerBg}`}>
        <div className={`w-9 h-9 rounded-xl ${c.iconBg} flex items-center justify-center ${c.iconText} shadow-sm`}>
          <Icon className="text-sm" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 font-medium">{subtitle}</p>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
};

// ─── Professional Stat Card ─────────────────────────────────────
const StatCard = ({ label, value, icon, color = "indigo", suffix = "", trend = null }) => {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    red: "bg-red-50 text-red-600 border-red-100",
    gray: "bg-gray-50 text-gray-600 border-gray-100",
  };
  const bgColor = colorMap[color] || colorMap.indigo;
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center border`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
          <p className="text-2xl font-black text-gray-900 truncate">{value}{suffix}</p>
          {trend && <p className="text-xs text-gray-400">{trend}</p>}
        </div>
      </div>
    </div>
  );
};

// ─── Animated Progress Bar with Left-to-Right Moving Car ──────
const ProgressBar = ({ current, total, label, icon: Icon, color = "indigo", showPercent = true }) => {
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  const colors = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    red: "bg-red-500",
  };
  const barColor = colors[color] || colors.indigo;
  const isMoving = pct > 0 && pct < 100;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-24 text-xs font-medium text-gray-600">
        <Icon className="text-sm" />
        <span>{label}</span>
      </div>
      <div className="flex-1 relative">
        <div className="w-full bg-gray-100 rounded-full h-7 overflow-hidden shadow-inner">
          {/* Fill bar with gradient */}
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out relative`}
            style={{ width: `${pct}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
          </div>

          {/* Running car icon – left to right, exactly at progress position */}
          <div
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
            style={{ left: `${Math.max(0, Math.min(100, pct))}%`, transform: 'translateX(-50%)' }}
          >
            <FaCarSide
              className={`text-red h-5 w-12 rounded-full text-base drop-shadow-md ${isMoving ? 'animate-pulse' : ''}`}
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                transform: isMoving ? 'rotate(0deg)' : 'rotate(0deg)',
              }}
            />
          </div>

          {/* Percentage label */}
          {showPercent && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs font-bold text-white drop-shadow-md">
                {Math.round(pct)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Donut Chart ────────────────────────────────────────────────
const DonutChart = ({ segments, size = 160, strokeWidth = 28 }) => {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  let cumulativeAngle = 0;
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  if (total === 0) return <p className="text-gray-400 text-center">No data</p>;

  const paths = segments.map((seg) => {
    const fraction = seg.value / total;
    const angle = fraction * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    const x1 = center + radius * Math.sin(startAngle);
    const y1 = center - radius * Math.cos(startAngle);
    const x2 = center + radius * Math.sin(endAngle);
    const y2 = center - radius * Math.cos(endAngle);

    const largeArc = angle > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
    return { d, color: seg.color, label: seg.label, value: seg.value };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        ))}
        <circle cx={center} cy={center} r={radius * 0.6} fill="white" />
        <text x={center} y={center + 5} textAnchor="middle" className="text-lg font-black fill-gray-800">
          {total}
        </text>
        <text x={center} y={center + 22} textAnchor="middle" className="text-[10px] font-medium fill-gray-400">
          Orders
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-600 font-medium">{seg.label}</span>
            <span className="font-bold text-gray-800">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────
export default function ProductionReportsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const router = useRouter();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/production-orders?_=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(Array.isArray(res.data) ? res.data : res.data?.orders || []);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ─── Filtering ────────────────────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    if (filterStatus !== "all") {
      if (filterStatus === "planned" && getOrderField(o, 'transferQty', 'transferqty') > 0) return false;
      if (filterStatus === "inprogress" && getOrderField(o, 'transferQty', 'transferqty') === 0) return false;
      if (filterStatus === "completed" && getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty') < (o.quantity || 0)) return false;
    }
    if (startDate) {
      const d = new Date(o.productionDate || o.createdAt);
      if (d < new Date(startDate)) return false;
    }
    if (endDate) {
      const d = new Date(o.productionDate || o.createdAt);
      if (d > new Date(endDate)) return false;
    }
    return true;
  });

  // ─── Aggregations ────────────────────────────────────────────
  const totalOrders = filteredOrders.length;
  const totalQty = filteredOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
  const totalTransfer = filteredOrders.reduce((sum, o) => sum + getOrderField(o, 'transferQty', 'transferqty'), 0);
  const totalIssue = filteredOrders.reduce((sum, o) => sum + getOrderField(o, 'isSuForProductionQty', 'issuforproductionqty'), 0);
  const totalReceipt = filteredOrders.reduce((sum, o) => sum + getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty'), 0);

  const completionRate = totalQty > 0 ? (totalReceipt / totalQty) * 100 : 0;
  const avgProgress = filteredOrders.reduce((sum, o) => {
    const qty = o.quantity || 0;
    const rec = getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty');
    return sum + (qty > 0 ? rec / qty : 0);
  }, 0) / (totalOrders || 1) * 100;

  const plannedOrders = filteredOrders.filter((o) => getOrderField(o, 'transferQty', 'transferqty') === 0).length;
  const inProgressOrders = filteredOrders.filter((o) => 
    getOrderField(o, 'transferQty', 'transferqty') > 0 && 
    getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty') < (o.quantity || 0)
  ).length;
  const completedOrders = filteredOrders.filter((o) => 
    getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty') >= (o.quantity || 0)
  ).length;

  const donutSegments = [
    { label: "Planned", value: plannedOrders, color: "#9CA3AF" },
    { label: "In Progress", value: inProgressOrders, color: "#F59E0B" },
    { label: "Completed", value: completedOrders, color: "#10B981" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
        <p className="mt-4 text-gray-400 font-medium">Loading production data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <ToastContainer position="bottom-right" theme="colored" />
      <div className="max-w-7xl mx-auto">
        {/* Header with actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Production Flow
              </span>
              <span className="text-sm font-normal text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                {totalOrders} orders
              </span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Real‑time overview of your manufacturing pipeline
              {lastUpdated && <span className="ml-2 text-xs">· Updated {lastUpdated}</span>}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchOrders}
              className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all flex items-center gap-2"
            >
              <FaSpinner className="animate-spin text-gray-400" size={12} />
              Refresh
            </button>
            <button
              onClick={() => router.push("/admin/productionorders-list-view")}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all flex items-center gap-2"
            >
              <FaCheck size={14} />
              Back to Orders
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5 tracking-wider">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
              >
                <option value="all">All</option>
                <option value="planned">Planned</option>
                <option value="inprogress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5 tracking-wider">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5 tracking-wider">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setFilterStatus("all"); setStartDate(""); setEndDate(""); }}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-all"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Total Orders" value={totalOrders} icon={<FaIndustry className="text-indigo-500" size={18} />} color="indigo" />
          <StatCard label="Total Qty" value={totalQty} icon={<FaChartBar className="text-indigo-500" size={18} />} color="indigo" />
          <StatCard label="Transferred" value={totalTransfer} icon={<FaTruck className="text-amber-500" size={18} />} color="amber" />
          <StatCard label="Issued" value={totalIssue} icon={<FaTools className="text-blue-500" size={18} />} color="blue" />
          <StatCard label="Received" value={totalReceipt} icon={<FaCheckCircle className="text-emerald-500" size={18} />} color="emerald" />
          <StatCard label="Completion" value={completionRate.toFixed(1)} suffix="%" icon={<FaPercentage className="text-green-500" size={18} />} color="emerald" trend={`${avgProgress.toFixed(1)}% avg progress`} />
        </div>

        {/* Advanced Metrics & Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <SectionCard icon={FaChartBar} title="Overall Progress" subtitle="Average completion across all orders" color="indigo">
              <div className="space-y-5">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-black text-gray-900">{avgProgress.toFixed(1)}%</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Average Progress</p>
                  </div>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, avgProgress)}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-2xl font-black text-amber-600">{plannedOrders}</p>
                    <p className="text-[10px] font-bold uppercase text-amber-500 tracking-wider">Planned</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-2xl font-black text-blue-600">{inProgressOrders}</p>
                    <p className="text-[10px] font-bold uppercase text-blue-500 tracking-wider">In Progress</p>
                  </div>
                  <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-2xl font-black text-emerald-600">{completedOrders}</p>
                    <p className="text-[10px] font-bold uppercase text-emerald-500 tracking-wider">Completed</p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
          <div className="flex items-center justify-center bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <DonutChart segments={donutSegments} size={160} strokeWidth={28} />
          </div>
        </div>

        {/* Detailed Table with Animated Progress Bars */}
        <SectionCard icon={FaChartBar} title="Order Flow Details" subtitle="Each order's progress through Transfer → Issue → Receipt" color="indigo">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 font-medium">No orders match the current filters.</p>
              <p className="text-sm text-gray-300 mt-1">Try adjusting your filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-400">Order ID</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-400">Product</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-wider text-gray-400 w-20">Planned</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-400 min-w-[240px]">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((o, idx) => {
                    const qty = o.quantity || 0;
                    const transfer = getOrderField(o, 'transferQty', 'transferqty');
                    const issue = getOrderField(o, 'isSuForProductionQty', 'issuforproductionqty');
                    const receipt = getOrderField(o, 'receiptForProductionQty', 'reciptforproductionqty');

                    return (
                      <tr key={o._id} className={`hover:bg-indigo-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[11px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg inline-block">
                            {o.productionDocNo || o.orderNumber || "Draft"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {typeof o.productDesc === "string" ? o.productDesc : "BOM Product"}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-gray-900">{qty}</td>
                        <td className="px-4 py-3 space-y-2">
                          <ProgressBar 
                            current={transfer} 
                            total={qty} 
                            label="Transfer" 
                            icon={FaTruck} 
                            color="amber" 
                          />
                          <ProgressBar 
                            current={issue} 
                            total={qty} 
                            label="Issue" 
                            icon={FaTools} 
                            color="blue" 
                          />
                          <ProgressBar 
                            current={receipt} 
                            total={qty} 
                            label="Receipt" 
                            icon={FaCheckCircle} 
                            color="emerald" 
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}